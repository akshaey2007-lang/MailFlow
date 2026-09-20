from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmailListView,
    EmailDetailView,
    EmailActionView,
    BulkActionsView,
    EmptyTrashView,
    SendEmailView,
    SyncEmailsView,
    PopulateInboxView,
    FolderCountsView,
    SearchView,
    DraftViewSet,
    SendDraftView,
    LabelViewSet,
    EmailLabelToggleView,
)

router = DefaultRouter()
router.register(r'drafts', DraftViewSet, basename='draft')
router.register(r'labels', LabelViewSet, basename='label')

urlpatterns = [
    # Router endpoints: /api/drafts/ and /api/labels/
    path('', include(router.urls)),

    # Email List, Send & Sync
    path('emails/', EmailListView.as_view(), name='email_list'),
    path('emails/send/', SendEmailView.as_view(), name='email_send'),
    path('emails/sync/', SyncEmailsView.as_view(), name='email_sync'),
    path('emails/populate-inbox/', PopulateInboxView.as_view(), name='populate_inbox'),
    path('emails/counts/', FolderCountsView.as_view(), name='folder_counts'),
    path('emails/search/', SearchView.as_view(), name='email_search'),
    path('emails/bulk/', BulkActionsView.as_view(), name='bulk_actions'),
    path('emails/empty-trash/', EmptyTrashView.as_view(), name='empty_trash'),

    # Folder shortcuts
    path('emails/inbox/', EmailListView.as_view(), {'folder': 'inbox'}, name='folder_inbox'),
    path('emails/sent/', EmailListView.as_view(), {'folder': 'sent'}, name='folder_sent'),
    path('emails/starred/', EmailListView.as_view(), {'folder': 'starred'}, name='folder_starred'),
    path('emails/important/', EmailListView.as_view(), {'folder': 'important'}, name='folder_important'),
    path('emails/spam/', EmailListView.as_view(), {'folder': 'spam'}, name='folder_spam'),
    path('emails/trash/', EmailListView.as_view(), {'folder': 'trash'}, name='folder_trash'),

    # Detail & Actions
    path('emails/<int:pk>/', EmailDetailView.as_view(), name='email_detail'),
    path('emails/<int:pk>/<str:action>/', EmailActionView.as_view(), name='email_action'),
    path('emails/<int:email_id>/labels/<int:label_id>/', EmailLabelToggleView.as_view(), name='email_label_toggle'),

    # Draft specific action
    path('drafts/<int:pk>/send/', SendDraftView.as_view(), name='draft_send'),
]
