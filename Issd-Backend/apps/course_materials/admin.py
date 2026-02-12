from django.contrib import admin
from .models import CourseMaterial, CourseMaterialBatch


class CourseMaterialBatchInline(admin.TabularInline):
    model = CourseMaterialBatch
    extra = 1


@admin.register(CourseMaterial)
class CourseMaterialAdmin(admin.ModelAdmin):
    list_display = ['title', 'module', 'faculty', 'material_type', 'is_active', 'created_at']
    list_filter = ['material_type', 'is_active', 'module']
    search_fields = ['title', 'description']
    inlines = [CourseMaterialBatchInline]


@admin.register(CourseMaterialBatch)
class CourseMaterialBatchAdmin(admin.ModelAdmin):
    list_display = ['material', 'batch', 'is_active', 'created_at']
    list_filter = ['is_active']
