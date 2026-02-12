from django.contrib import admin
from . import models


@admin.register(models.BatchTemplate)
class BatchTemplateAdmin(admin.ModelAdmin):
	list_display = ("name", "course", "mode", "max_students", "is_active", "created_at")
	search_fields = ("name", "course__name")
	list_filter = ("mode", "is_active")
	raw_id_fields = ("course",)
	ordering = ("course", "name")


@admin.register(models.Batch)
class BatchAdmin(admin.ModelAdmin):
	list_display = ("code", "template", "centre", "status", "start_date", "end_date", "is_active")
	search_fields = ("code", "centre__name", "template__name")
	list_filter = ("status", "is_active")
	raw_id_fields = ("template", "centre")
	date_hierarchy = "start_date"


@admin.register(models.BatchStudent)
class BatchStudentAdmin(admin.ModelAdmin):
	list_display = ("student", "batch", "joined_at", "left_at", "is_active")
	search_fields = ("student__user__email", "batch__code")
	list_filter = ("is_active",)
	raw_id_fields = ("batch", "student")
	date_hierarchy = "joined_at"


@admin.register(models.BatchTransferLog)
class BatchTransferLogAdmin(admin.ModelAdmin):
	list_display = ("student", "from_batch", "to_batch", "transferred_by", "transferred_at")
	search_fields = ("student__user__email", "transferred_by__email", "from_batch__code", "to_batch__code")
	raw_id_fields = ("student", "from_batch", "to_batch", "transferred_by", "audit_log")
	date_hierarchy = "transferred_at"

