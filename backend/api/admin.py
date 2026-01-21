from django.contrib import admin
from api.models import CustomUser

class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'role', 'extra_roles']

admin.site.register(CustomUser, UserAdmin)