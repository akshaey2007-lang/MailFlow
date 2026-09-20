import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Paperclip,
  Trash2,
  Send,
  Save,
  Bold,
  Italic,
  List,
  Quote,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { emailApi } from '../../api/emails';
import { useToast } from '../../context/ToastContext';

export const ComposeModal = ({
  isOpen,
  onClose,
  onEmailSent,
  initialData = {}, // { to, subject, body, in_reply_to, thread_id, draftId }
  userSignature = '',
}) => {
  const { toast } = useToast();

  const [to, setTo] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [cc, setCc] = useState('');
  const [showBcc, setShowBcc] = useState(false);
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState(''); // 'saving' | 'saved' | ''
  const [draftId, setDraftId] = useState(null);
  const [errors, setErrors] = useState({});

  const fileInputRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const isInitialMount = useRef(true);

  // Initialize or reset when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setTo(initialData.to || '');
      setCc(initialData.cc || '');
      setShowCc(Boolean(initialData.cc));
      setBcc(initialData.bcc || '');
      setShowBcc(Boolean(initialData.bcc));
      setSubject(initialData.subject || '');

      // Append default signature if new composition
      let initialBody = initialData.body || '';
      if (!initialBody && userSignature) {
        initialBody = `\n\n${userSignature}`;
      }
      setBody(initialBody);
      setDraftId(initialData.draftId || null);
      setAttachments([]);
      setIsMinimized(false);
      setAutosaveStatus('');
      setErrors({});
      isInitialMount.current = true;
    }
  }, [isOpen, initialData, userSignature]);

  // Debounced Autosave to Drafts
  useEffect(() => {
    if (!isOpen) return;

    // Skip autosave on very first mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only autosave if there is some meaningful content
    if (!to.trim() && !subject.trim() && !body.trim()) {
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      setAutosaveStatus('saving');
      try {
        const draftData = {
          id: draftId,
          to: to.trim(),
          cc: cc.trim(),
          bcc: bcc.trim(),
          subject: subject.trim(),
          body: body,
          thread_id: initialData.thread_id || '',
          in_reply_to: initialData.in_reply_to || '',
        };

        const savedDraft = await emailApi.saveDraft(draftData);
        if (!draftId && savedDraft.id) {
          setDraftId(savedDraft.id);
        }
        setAutosaveStatus('saved');
      } catch (err) {
        setAutosaveStatus('');
      }
    }, 2500);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [to, cc, bcc, subject, body, isOpen, draftId]);

  if (!isOpen) return null;

  const validateForm = () => {
    const errs = {};
    if (!to.trim()) {
      errs.to = 'At least one recipient email is required.';
    } else {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const recipients = to.split(',').map((r) => r.trim()).filter(Boolean);
      const invalid = recipients.filter((r) => !emailRegex.test(r));
      if (invalid.length > 0) {
        errs.to = `Invalid email address format: ${invalid.join(', ')}`;
      }
    }

    if (!subject.trim()) {
      errs.subject = 'Subject is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    const maxSize = 10 * 1024 * 1024; // 10MB limit

    const currentTotal = attachments.reduce((acc, f) => acc + f.size, 0);
    const newTotal = selected.reduce((acc, f) => acc + f.size, currentTotal);

    if (newTotal > maxSize) {
      toast.error('Total attachments size exceeds 10MB limit.');
      return;
    }

    setAttachments((prev) => [...prev, ...selected]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!validateForm()) return;

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('to', to.trim());
      if (cc.trim()) formData.append('cc', cc.trim());
      if (bcc.trim()) formData.append('bcc', bcc.trim());
      formData.append('subject', subject.trim());
      formData.append('body_text', body);
      formData.append('body_html', `<p>${body.replace(/\n/g, '<br>')}</p>`);

      if (initialData.thread_id) formData.append('thread_id', initialData.thread_id);
      if (initialData.in_reply_to) formData.append('in_reply_to', initialData.in_reply_to);
      if (draftId) formData.append('draft_id', draftId);

      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await emailApi.sendEmail(formData);
      if (response.warning) {
        toast.info(response.message || response.warning);
      } else {
        toast.success(response.message || 'Email sent successfully!');
      }

      if (onEmailSent) {
        onEmailSent(response);
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to dispatch email';
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleManualSaveDraft = async () => {
    setAutosaveStatus('saving');
    try {
      const draftData = {
        id: draftId,
        to: to.trim(),
        cc: cc.trim(),
        bcc: bcc.trim(),
        subject: subject.trim(),
        body: body,
        thread_id: initialData.thread_id || '',
        in_reply_to: initialData.in_reply_to || '',
      };
      const saved = await emailApi.saveDraft(draftData);
      setDraftId(saved.id);
      setAutosaveStatus('saved');
      toast.success('Draft saved successfully');
    } catch (err) {
      toast.error('Could not save draft');
    }
  };

  const insertFormatting = (prefix, suffix = '') => {
    setBody((prev) => `${prev}${prefix} ${suffix}`);
  };

  return (
    <div
      className={`fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-200 flex flex-col ${
        isMaximized
          ? 'inset-4 rounded-2xl'
          : isMinimized
          ? 'bottom-0 right-8 w-80 h-12 rounded-t-xl overflow-hidden'
          : 'bottom-0 right-4 sm:right-8 w-full max-w-2xl h-[600px] rounded-t-2xl'
      }`}
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-t-xl select-none flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {subject.trim() ? subject : 'New Message'}
          </span>
          {autosaveStatus === 'saving' && (
            <span className="text-[11px] text-slate-400">Saving...</span>
          )}
          {autosaveStatus === 'saved' && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Draft saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          {!isMinimized && (
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors hidden sm:block"
            >
              {isMaximized ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body container (hidden if minimized) */}
      {!isMinimized && (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          {/* Email Recipients & Subject Form */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-shrink-0">
            {/* TO Field */}
            <div className="flex items-center px-4 py-2">
              <span className="w-16 text-xs font-semibold text-slate-400">To</span>
              <input
                type="text"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  if (errors.to) setErrors((prev) => ({ ...prev, to: null }));
                }}
                placeholder="recipients@example.com (comma separated)"
                className="flex-1 text-sm bg-transparent border-none text-slate-900 dark:text-slate-100 focus:outline-none placeholder-slate-400"
                autoFocus
              />
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium ml-2">
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    className="hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    Bcc
                  </button>
                )}
              </div>
            </div>
            {errors.to && (
              <div className="px-4 py-1 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40">
                {errors.to}
              </div>
            )}

            {/* CC Field */}
            {showCc && (
              <div className="flex items-center px-4 py-2">
                <span className="w-16 text-xs font-semibold text-slate-400">Cc</span>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="flex-1 text-sm bg-transparent border-none text-slate-900 dark:text-slate-100 focus:outline-none placeholder-slate-400"
                />
              </div>
            )}

            {/* BCC Field */}
            {showBcc && (
              <div className="flex items-center px-4 py-2">
                <span className="w-16 text-xs font-semibold text-slate-400">Bcc</span>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="flex-1 text-sm bg-transparent border-none text-slate-900 dark:text-slate-100 focus:outline-none placeholder-slate-400"
                />
              </div>
            )}

            {/* Subject Field */}
            <div className="flex items-center px-4 py-2">
              <span className="w-16 text-xs font-semibold text-slate-400">Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  if (errors.subject) setErrors((prev) => ({ ...prev, subject: null }));
                }}
                placeholder="Email Subject"
                className="flex-1 text-sm bg-transparent border-none text-slate-900 dark:text-slate-100 focus:outline-none placeholder-slate-400 font-medium"
              />
            </div>
            {errors.subject && (
              <div className="px-4 py-1 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40">
                {errors.subject}
              </div>
            )}
          </div>

          {/* Formatting Toolbar */}
          <div className="flex items-center gap-1 px-4 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 flex-shrink-0">
            <button
              type="button"
              onClick={() => insertFormatting('**bold**')}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded transition-colors"
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*italic*')}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded transition-colors"
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('\n- ')}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded transition-colors"
              title="Bullet List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('\n> ')}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded transition-colors"
              title="Quote"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Textarea Message Body */}
          <div className="flex-1 p-4 overflow-y-auto">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email message here..."
              className="w-full h-full min-h-[160px] bg-transparent border-none resize-none focus:outline-none text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 font-sans leading-relaxed"
            />
          </div>

          {/* Attachment Chips List */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap max-h-24 overflow-y-auto flex-shrink-0">
              {attachments.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  <Paperclip className="w-3 h-3 text-slate-400" />
                  <span className="truncate max-w-xs">{file.name}</span>
                  <span className="text-[10px] text-slate-400">
                    ({Math.round(file.size / 1024)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl shadow-sm hover:shadow transition-all"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'Sending...' : 'Send'}
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Attach Files"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.zip"
              />

              <button
                type="button"
                onClick={handleManualSaveDraft}
                className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Save Draft"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
              title="Discard draft"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
