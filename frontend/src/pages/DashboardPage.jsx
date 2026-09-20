import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { EmailList } from '../components/email/EmailList';
import { EmailViewer } from '../components/email/EmailViewer';
import { ComposeModal } from '../components/email/ComposeModal';
import { emailApi } from '../api/emails';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const DashboardPage = () => {
  const { folder: routeFolder, id: routeLabelId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const currentFolder = routeLabelId ? 'label' : routeFolder || 'inbox';

  const [emails, setEmails] = useState([]);
  const [counts, setCounts] = useState({});
  const [labels, setLabels] = useState([]);
  const [activeEmail, setActiveEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPopulating, setIsPopulating] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = user?.emails_per_page || 20;
  const [searchFilters, setSearchFilters] = useState(null);

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeInitialData, setComposeInitialData] = useState({});

  // Fetch counts & labels
  const fetchCountsAndLabels = useCallback(async () => {
    try {
      const [countsRes, labelsRes] = await Promise.all([
        emailApi.getFolderCounts(),
        emailApi.getLabels(),
      ]);
      setCounts(countsRes);
      setLabels(labelsRes);
    } catch (err) {
      // Background failure safe
    }
  }, []);

  // Fetch email list
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      const params = {
        page,
        ...(searchFilters || {}),
      };

      if (searchFilters && (searchFilters.q || searchFilters.has_attachment || searchFilters.is_starred || searchFilters.is_important || searchFilters.is_read !== '' || searchFilters.label)) {
        data = await emailApi.searchEmails(params);
      } else if (routeLabelId) {
        data = await emailApi.getEmails({ ...params, label: routeLabelId });
      } else if (currentFolder === 'drafts') {
        const draftsRes = await emailApi.getDrafts();
        // Format drafts into email-like shape for listing
        const formatted = (draftsRes.results || draftsRes).map((d) => ({
          id: d.id,
          is_draft: true,
          sender_name: 'Draft',
          sender_email: user?.email,
          recipient_emails: d.to || '(No Recipient)',
          subject: d.subject || '(No Subject)',
          snippet: d.body ? d.body.slice(0, 100) : '(Empty Draft)',
          folder: 'drafts',
          is_read: true,
          created_at: d.created_at,
          updated_at: d.updated_at,
          rawDraft: d,
        }));
        data = { results: formatted, count: formatted.length };
      } else {
        data = await emailApi.getFolderEmails(currentFolder, params);
      }

      const results = data.results || (Array.isArray(data) ? data : []);
      setEmails(results);
      setTotalCount(data.count !== undefined ? data.count : results.length);

      // Reset active email if current one is not in results
      if (activeEmail && !results.some((e) => e.id === activeEmail.id)) {
        setActiveEmail(null);
      }
    } catch (err) {
      toast.error('Failed to load emails');
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [currentFolder, routeLabelId, page, searchFilters, user?.email]);

  useEffect(() => {
    fetchCountsAndLabels();
  }, [fetchCountsAndLabels]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Handle selecting an email
  const handleSelectEmail = async (emailItem) => {
    if (emailItem.is_draft) {
      // Clicking a draft opens it directly in the Compose window!
      setComposeInitialData({
        draftId: emailItem.rawDraft.id,
        to: emailItem.rawDraft.to,
        cc: emailItem.rawDraft.cc,
        bcc: emailItem.rawDraft.bcc,
        subject: emailItem.rawDraft.subject,
        body: emailItem.rawDraft.body,
        thread_id: emailItem.rawDraft.thread_id,
        in_reply_to: emailItem.rawDraft.in_reply_to,
      });
      setIsComposeOpen(true);
      return;
    }

    try {
      const fullEmail = await emailApi.getEmail(emailItem.id);
      setActiveEmail(fullEmail);

      // If it was unread, update local list and counts
      if (!emailItem.is_read) {
        setEmails((prev) =>
          prev.map((e) => (e.id === emailItem.id ? { ...e, is_read: true } : e))
        );
        fetchCountsAndLabels();
      }
    } catch (err) {
      toast.error('Could not load email detail');
    }
  };

  // Actions
  const handleStarToggle = async (emailId) => {
    try {
      const res = await emailApi.toggleStar(emailId);
      setEmails((prev) =>
        prev.map((e) => (e.id === emailId ? { ...e, is_starred: res.is_starred } : e))
      );
      if (activeEmail && activeEmail.id === emailId) {
        setActiveEmail((prev) => ({ ...prev, is_starred: res.is_starred }));
      }
      fetchCountsAndLabels();
    } catch (err) {
      toast.error('Failed to update star');
    }
  };

  const handleImportantToggle = async (emailId) => {
    try {
      const res = await emailApi.toggleImportant(emailId);
      setEmails((prev) =>
        prev.map((e) => (e.id === emailId ? { ...e, is_important: res.is_important } : e))
      );
      if (activeEmail && activeEmail.id === emailId) {
        setActiveEmail((prev) => ({ ...prev, is_important: res.is_important }));
      }
      fetchCountsAndLabels();
    } catch (err) {
      toast.error('Failed to update importance');
    }
  };

  const handleTrash = async (emailId) => {
    try {
      await emailApi.moveToTrash(emailId);
      toast.success('Moved to trash');
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      if (activeEmail?.id === emailId) setActiveEmail(null);
      fetchCountsAndLabels();
    } catch (err) {
      toast.error('Failed to move to trash');
    }
  };

  const handleRestore = async (emailId) => {
    try {
      await emailApi.restoreEmail(emailId);
      toast.success('Restored to inbox');
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      if (activeEmail?.id === emailId) setActiveEmail(null);
      fetchCountsAndLabels();
    } catch (err) {
      toast.error('Failed to restore email');
    }
  };

  const handleArchive = async (emailId) => {
    try {
      await emailApi.archiveEmail(emailId);
      toast.success('Email archived');
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      if (activeEmail?.id === emailId) setActiveEmail(null);
      fetchCountsAndLabels();
    } catch (err) {
      toast.error('Failed to archive');
    }
  };

  const handleMarkUnread = async (emailId) => {
    try {
      await emailApi.markUnread(emailId);
      toast.info('Marked as unread');
      setEmails((prev) =>
        prev.map((e) => (e.id === emailId ? { ...e, is_read: false } : e))
      );
      setActiveEmail(null);
      fetchCountsAndLabels();
    } catch (err) {
      toast.error('Failed to mark unread');
    }
  };

  const handleSpam = async (emailId) => {
    try {
      await emailApi.markSpam(emailId);
      toast.success('Marked as spam');
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      if (activeEmail?.id === emailId) setActiveEmail(null);
      fetchCountsAndLabels();
    } catch (err) {
      toast.error('Failed to mark as spam');
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await emailApi.emptyTrash();
      toast.success('Trash emptied successfully');
      setEmails([]);
      setActiveEmail(null);
      fetchCountsAndLabels();
    } catch (err) {
      toast.error('Failed to empty trash');
    }
  };

  const handleBulkAction = async (emailIds, action, labelId = null) => {
    try {
      const res = await emailApi.bulkAction(emailIds, action, labelId);
      toast.success(res.message || 'Bulk action applied');
      fetchEmails();
      fetchCountsAndLabels();
    } catch (err) {
      toast.error('Bulk action failed');
    }
  };

  const handlePopulateSample = async (reset = false) => {
    if (isPopulating) return;
    setIsPopulating(true);
    try {
      const res = await emailApi.populateInbox(reset);
      toast.success(res.message || 'Sample emails loaded successfully!');
      fetchEmails();
      fetchCountsAndLabels();
    } catch (err) {
      toast.error('Failed to populate sample emails');
    } finally {
      setIsPopulating(false);
    }
  };

  // Label management
  const handleCreateLabel = async (data) => {
    try {
      const created = await emailApi.createLabel(data);
      setLabels((prev) => [...prev, created]);
      toast.success(`Label "${created.name}" created`);
    } catch (err) {
      toast.error('Failed to create label');
    }
  };

  const handleUpdateLabel = async (id, data) => {
    try {
      const updated = await emailApi.updateLabel(id, data);
      setLabels((prev) => prev.map((l) => (l.id === id ? updated : l)));
      toast.success('Label updated');
    } catch (err) {
      toast.error('Failed to update label');
    }
  };

  const handleDeleteLabel = async (id) => {
    try {
      await emailApi.deleteLabel(id);
      setLabels((prev) => prev.filter((l) => l.id !== id));
      toast.success('Label deleted');
      if (routeLabelId === String(id)) {
        navigate('/inbox');
      }
    } catch (err) {
      toast.error('Failed to delete label');
    }
  };

  const handleToggleLabel = async (emailId, labelId) => {
    try {
      const res = await emailApi.toggleLabel(emailId, labelId);
      // Refresh full active email
      const updated = await emailApi.getEmail(emailId);
      setActiveEmail(updated);
      setEmails((prev) =>
        prev.map((e) => (e.id === emailId ? { ...e, labels: updated.labels } : e))
      );
      fetchCountsAndLabels();
    } catch (err) {
      toast.error('Failed to update label on email');
    }
  };

  // Compose / Replies
  const handleOpenCompose = () => {
    setComposeInitialData({});
    setIsComposeOpen(true);
  };

  const handleReply = (emailItem) => {
    setComposeInitialData({
      to: emailItem.sender_email,
      subject: emailItem.subject.startsWith('Re:')
        ? emailItem.subject
        : `Re: ${emailItem.subject}`,
      body: `\n\nOn ${new Date(emailItem.received_at || emailItem.created_at).toLocaleString()}, ${
        emailItem.sender_name || emailItem.sender_email
      } wrote:\n> ${emailItem.body_text?.replace(/\n/g, '\n> ') || ''}`,
      in_reply_to: emailItem.message_id || '',
      thread_id: emailItem.thread_id || '',
    });
    setIsComposeOpen(true);
  };

  const handleReplyAll = (emailItem) => {
    setComposeInitialData({
      to: emailItem.sender_email,
      cc: emailItem.recipient_emails
        ?.split(',')
        .map((r) => r.trim())
        .filter((r) => r && r !== user?.email)
        .join(', '),
      subject: emailItem.subject.startsWith('Re:')
        ? emailItem.subject
        : `Re: ${emailItem.subject}`,
      body: `\n\nOn ${new Date(emailItem.received_at || emailItem.created_at).toLocaleString()}, ${
        emailItem.sender_name || emailItem.sender_email
      } wrote:\n> ${emailItem.body_text?.replace(/\n/g, '\n> ') || ''}`,
      in_reply_to: emailItem.message_id || '',
      thread_id: emailItem.thread_id || '',
    });
    setIsComposeOpen(true);
  };

  const handleForward = (emailItem) => {
    setComposeInitialData({
      to: '',
      subject: emailItem.subject.startsWith('Fwd:')
        ? emailItem.subject
        : `Fwd: ${emailItem.subject}`,
      body: `\n\n---------- Forwarded message ---------\nFrom: ${
        emailItem.sender_name || ''
      } <${emailItem.sender_email}>\nSubject: ${emailItem.subject}\n\n${
        emailItem.body_text || ''
      }`,
    });
    setIsComposeOpen(true);
  };

  const handleQuickReply = async (emailItem, replyText) => {
    const formData = new FormData();
    formData.append('to', emailItem.sender_email);
    formData.append(
      'subject',
      emailItem.subject.startsWith('Re:') ? emailItem.subject : `Re: ${emailItem.subject}`
    );
    formData.append('body_text', replyText);
    formData.append('body_html', `<p>${replyText.replace(/\n/g, '<br>')}</p>`);
    formData.append('in_reply_to', emailItem.message_id || '');
    formData.append('thread_id', emailItem.thread_id || '');

    await emailApi.sendEmail(formData);
    toast.success('Reply sent successfully!');
    // Re-fetch email detail to show updated conversation thread
    const refreshed = await emailApi.getEmail(emailItem.id);
    setActiveEmail(refreshed);
    fetchCountsAndLabels();
  };

  const handleSearch = (filters) => {
    setSearchFilters(filters);
    setPage(1);
  };

  const handleSyncComplete = (res) => {
    fetchEmails();
    fetchCountsAndLabels();
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Top Navigation */}
      <Navbar
        onSearch={handleSearch}
        onSyncComplete={handleSyncComplete}
        onPopulateSample={handlePopulateSample}
        isPopulating={isPopulating}
        labels={labels}
        currentFilters={searchFilters || {}}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* 3-Column Responsive Dashboard Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Sidebar */}
        <Sidebar
          counts={counts}
          labels={labels}
          onOpenCompose={handleOpenCompose}
          onCreateLabel={handleCreateLabel}
          onUpdateLabel={handleUpdateLabel}
          onDeleteLabel={handleDeleteLabel}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Column 2 & Column 3 Container */}
        <main className="flex-1 flex overflow-hidden relative">
          {/* Column 2: Email List (Hidden on mobile if email is active) */}
          <div
            className={`w-full lg:w-[420px] xl:w-[480px] h-full flex-shrink-0 flex flex-col ${
              activeEmail ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <EmailList
              emails={emails}
              loading={loading}
              folder={currentFolder}
              activeEmailId={activeEmail?.id}
              totalCount={totalCount}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onSelectEmail={handleSelectEmail}
              onRefresh={fetchEmails}
              onStarToggle={handleStarToggle}
              onImportantToggle={handleImportantToggle}
              onBulkAction={handleBulkAction}
              onEmptyTrash={handleEmptyTrash}
              onPopulateSample={handlePopulateSample}
              isPopulating={isPopulating}
              labels={labels}
            />
          </div>

          {/* Column 3: Email Viewer (Visible on mobile only if email is active) */}
          <div
            className={`flex-1 h-full overflow-hidden ${
              activeEmail ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <EmailViewer
              email={activeEmail}
              onClose={() => setActiveEmail(null)}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
              onStarToggle={handleStarToggle}
              onImportantToggle={handleImportantToggle}
              onTrash={handleTrash}
              onArchive={handleArchive}
              onMarkUnread={handleMarkUnread}
              onSpam={handleSpam}
              onRestore={handleRestore}
              labels={labels}
              onToggleLabel={handleToggleLabel}
              onQuickReply={handleQuickReply}
            />
          </div>
        </main>
      </div>

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onEmailSent={() => {
          fetchEmails();
          fetchCountsAndLabels();
        }}
        initialData={composeInitialData}
        userSignature={user?.default_signature || ''}
      />
    </div>
  );
};
