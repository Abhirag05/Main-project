"""
Serializers for the course_materials module.
Handles faculty upload/list/update and student read-only access.
"""
import os
from rest_framework import serializers
from .models import CourseMaterial, CourseMaterialBatch
from apps.academics.models import Module
from apps.faculty.models import FacultyProfile, FacultyModuleAssignment, FacultyBatchAssignment
from apps.batch_management.models import Batch


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
ALLOWED_EXTENSIONS = {'pdf', 'ppt', 'pptx', 'doc', 'docx'}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


# ---------------------------------------------------------------------------
# Nested read-only helpers
# ---------------------------------------------------------------------------
class ModuleMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ['id', 'code', 'name']


class BatchMiniSerializer(serializers.ModelSerializer):
    mode = serializers.CharField(source='template.mode', read_only=True)

    class Meta:
        model = Batch
        fields = ['id', 'code', 'mode']


class FacultyMiniSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = FacultyProfile
        fields = ['id', 'employee_code', 'name']


# ---------------------------------------------------------------------------
# Batch assignment serializer (nested)
# ---------------------------------------------------------------------------
class CourseMaterialBatchReadSerializer(serializers.ModelSerializer):
    batch = BatchMiniSerializer(read_only=True)

    class Meta:
        model = CourseMaterialBatch
        fields = ['id', 'batch', 'is_active']


# ---------------------------------------------------------------------------
# Faculty: Create Material
# ---------------------------------------------------------------------------
class CreateCourseMaterialSerializer(serializers.Serializer):
    """
    Accepts multipart/form-data.
    Either `file` or `external_url` must be provided, not both.
    `batch_ids` is a list of batch PKs to assign material to.
    """
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(
        required=False, allow_blank=True, default='')
    module_id = serializers.IntegerField()
    material_type = serializers.ChoiceField(
        choices=CourseMaterial.MaterialType.choices)
    file = serializers.FileField(required=False, allow_null=True)
    external_url = serializers.URLField(
        required=False, allow_blank=True, allow_null=True)
    batch_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text="List of batch IDs to assign this material to"
    )

    def validate_file(self, value):
        if value is None:
            return value
        # Extension check
        ext = os.path.splitext(value.name)[1].lstrip('.').lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                f"File type '.{ext}' is not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )
        # Size check
        if value.size > MAX_FILE_SIZE:
            raise serializers.ValidationError(
                f"File size ({value.size // (1024*1024)} MB) exceeds the 20 MB limit."
            )
        return value

    def validate(self, attrs):
        """
        - Either file OR external_url, not both, and at least one required.
        - Faculty must be assigned to the module.
        - Faculty must be assigned to every batch in batch_ids.
        """
        file = attrs.get('file')
        url = attrs.get('external_url')
        mat_type = attrs['material_type']

        # Mutual exclusion
        if file and url:
            raise serializers.ValidationError(
                "Provide either a file upload or an external URL, not both."
            )
        if not file and not url:
            raise serializers.ValidationError(
                "Either a file upload or an external URL is required."
            )

        # For document types a file is expected; for LINK/VIDEO an external URL
        if mat_type in ('PDF', 'PPT', 'DOC') and not file:
            raise serializers.ValidationError(
                f"A file upload is required for material type '{mat_type}'."
            )
        if mat_type in ('LINK', 'VIDEO') and not url:
            raise serializers.ValidationError(
                f"An external URL is required for material type '{mat_type}'."
            )

        # Faculty context (set by the view)
        faculty: FacultyProfile = self.context['faculty']

        # Module assignment check
        module_id = attrs['module_id']
        if not Module.objects.filter(id=module_id, is_active=True).exists():
            raise serializers.ValidationError(
                {"module_id": "Module not found or inactive."})

        if not FacultyModuleAssignment.objects.filter(
            faculty=faculty, module_id=module_id, is_active=True
        ).exists():
            raise serializers.ValidationError(
                {"module_id": "You are not assigned to teach this module."}
            )

        # Batch assignment check
        batch_ids = attrs['batch_ids']
        valid_batch_ids = set(
            FacultyBatchAssignment.objects.filter(
                faculty=faculty, batch_id__in=batch_ids, is_active=True
            ).values_list('batch_id', flat=True)
        )
        invalid = set(batch_ids) - valid_batch_ids
        if invalid:
            raise serializers.ValidationError(
                {"batch_ids":
                    f"You are not assigned to batch(es): {sorted(invalid)}"}
            )

        return attrs

    def create(self, validated_data):
        faculty = self.context['faculty']
        batch_ids = validated_data.pop('batch_ids')
        module_id = validated_data.pop('module_id')

        material = CourseMaterial.objects.create(
            title=validated_data['title'],
            description=validated_data.get('description', ''),
            module_id=module_id,
            faculty=faculty,
            material_type=validated_data['material_type'],
            file=validated_data.get('file'),
            external_url=validated_data.get('external_url') or None,
        )

        # Create batch mappings
        CourseMaterialBatch.objects.bulk_create([
            CourseMaterialBatch(material=material, batch_id=bid)
            for bid in batch_ids
        ])

        return material


# ---------------------------------------------------------------------------
# Faculty: List / Detail
# ---------------------------------------------------------------------------
class CourseMaterialListSerializer(serializers.ModelSerializer):
    module = ModuleMiniSerializer(read_only=True)
    faculty = FacultyMiniSerializer(read_only=True)
    assigned_batches = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = CourseMaterial
        fields = [
            'id', 'title', 'description', 'module', 'faculty',
            'material_type', 'file_url', 'external_url',
            'is_active', 'created_at', 'updated_at',
            'assigned_batches',
        ]

    def get_assigned_batches(self, obj):
        prefetched = getattr(obj, 'active_batch_assignments', None)
        if prefetched is not None:
            return CourseMaterialBatchReadSerializer(prefetched, many=True).data
        qs = obj.batch_assignments.select_related(
            'batch__template').filter(is_active=True)
        return CourseMaterialBatchReadSerializer(qs, many=True).data

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


# ---------------------------------------------------------------------------
# Faculty: Update Material
# ---------------------------------------------------------------------------
class UpdateCourseMaterialSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    material_type = serializers.ChoiceField(
        choices=CourseMaterial.MaterialType.choices, required=False
    )
    file = serializers.FileField(required=False, allow_null=True)
    external_url = serializers.URLField(
        required=False, allow_blank=True, allow_null=True)
    is_active = serializers.BooleanField(required=False)

    def validate_file(self, value):
        if value is None:
            return value
        ext = os.path.splitext(value.name)[1].lstrip('.').lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                f"File type '.{ext}' is not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )
        if value.size > MAX_FILE_SIZE:
            raise serializers.ValidationError(
                f"File size exceeds 20 MB limit."
            )
        return value

    def update(self, instance, validated_data):
        for field in ('title', 'description', 'material_type', 'is_active'):
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        if 'file' in validated_data:
            instance.file = validated_data['file']
            instance.external_url = None
        elif 'external_url' in validated_data:
            ext_url = validated_data['external_url']
            if ext_url:
                instance.external_url = ext_url
                instance.file = None

        instance.save()
        return instance


# ---------------------------------------------------------------------------
# Faculty: Assign Batches
# ---------------------------------------------------------------------------
class AssignBatchesSerializer(serializers.Serializer):
    """
    Replace the current batch set for a material.
    Accepts a list of batch IDs; deactivates removed, creates new.
    """
    batch_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
    )

    def validate_batch_ids(self, value):
        faculty = self.context['faculty']
        valid_ids = set(
            FacultyBatchAssignment.objects.filter(
                faculty=faculty, batch_id__in=value, is_active=True
            ).values_list('batch_id', flat=True)
        )
        invalid = set(value) - valid_ids
        if invalid:
            raise serializers.ValidationError(
                f"You are not assigned to batch(es): {sorted(invalid)}"
            )
        return value

    def save(self, material):
        new_ids = set(self.validated_data['batch_ids'])

        # Existing active batch IDs for this material
        existing = set(
            CourseMaterialBatch.objects.filter(
                material=material, is_active=True)
            .values_list('batch_id', flat=True)
        )

        # Deactivate removed
        to_remove = existing - new_ids
        if to_remove:
            CourseMaterialBatch.objects.filter(
                material=material, batch_id__in=to_remove
            ).update(is_active=False)

        # Activate or create new
        to_add = new_ids - existing
        for bid in to_add:
            CourseMaterialBatch.objects.update_or_create(
                material=material, batch_id=bid,
                defaults={'is_active': True}
            )

        return material


# ---------------------------------------------------------------------------
# Student: List
# ---------------------------------------------------------------------------
class StudentCourseMaterialSerializer(serializers.ModelSerializer):
    module = ModuleMiniSerializer(read_only=True)
    faculty_name = serializers.CharField(
        source='faculty.user.full_name', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = CourseMaterial
        fields = [
            'id', 'title', 'description', 'module',
            'material_type', 'file_url', 'external_url',
            'faculty_name', 'created_at',
        ]

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
