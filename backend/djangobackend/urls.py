from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

from django.conf import settings
from django.conf.urls.static import static

def home(request):
    return HttpResponse(
        '<h1>Welcome to the Django app!</h1><p>Click <a href="/admin/">here</a> to access the admin panel.</p>'
    )

urlpatterns = [
    path('', home, name='home'),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('ckeditor5/', include('django_ckeditor_5.urls')),
]


urlpatterns +=static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)