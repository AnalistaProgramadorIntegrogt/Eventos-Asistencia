import React, { useEffect, useState, useRef } from 'react';
import { Card, Table, Button, Modal, Form, Input, Tag, Upload, Typography, Space, Popconfirm, message, Row, Col, Select, Switch, Tooltip, Segmented, Badge, QRCode, Popover, Alert } from 'antd';
import { UserAddOutlined, UploadOutlined, CopyOutlined, CheckOutlined, ReloadOutlined, PoweroffOutlined, FileExcelOutlined, SearchOutlined, DeleteOutlined, SyncOutlined, StarOutlined, GlobalOutlined, TeamOutlined, CheckCircleOutlined, ClockCircleOutlined, DownloadOutlined, QrcodeOutlined, ExportOutlined, EditOutlined, TagOutlined, MailOutlined, SendOutlined, PhoneOutlined, WhatsAppOutlined } from '@ant-design/icons';
import { api, getStoredUser } from '../services/apiService';

const { Title, Text } = Typography;

export default function GuestManagement({ selectedEventId, embedded = false, currentUser }) {
  const activeUser = currentUser || getStoredUser();
  const isSuperAdmin = activeUser?.role === 'super_admin';
  const isAdmin = activeUser?.role === 'admin' || isSuperAdmin;
  const userPerms = activeUser?.permissions || [];

  const hasPerm = (permKey) => {
    if (isSuperAdmin) return true;
    if (Array.isArray(userPerms) && userPerms.length > 0) {
      return userPerms.includes(permKey);
    }
    if (isAdmin) return true;
    return false;
  };

  const canImportExcel = hasPerm('IMPORT_GUESTS_EXCEL');
  const canAddSingle = hasPerm('ADD_GUEST_SINGLE');
  const canEditGuestInfo = hasPerm('EDIT_GUEST_INFO') || hasPerm('EDIT_GUEST');
  const canEditGuestRSVP = hasPerm('EDIT_GUEST_RSVP') || hasPerm('EDIT_GUEST');
  const canMarkAttendance = hasPerm('MARK_ATTENDANCE_MANUAL');
  const canViewQR = hasPerm('VIEW_GUEST_QR');
  const canCopyLink = hasPerm('COPY_GUEST_LINK');
  const canRegenerateQR = hasPerm('REGENERATE_GUEST_QR');
  const canAssignBulkCategory = hasPerm('ASSIGN_BULK_CATEGORY') || hasPerm('ASSIGN_GUEST_CATEGORY') || hasPerm('EDIT_GUEST_INFO') || hasPerm('EDIT_GUEST');
  const canResendSingleQR = hasPerm('RESEND_QR_EMAIL_SINGLE');
  const canResendBulkQR = hasPerm('RESEND_QR_EMAIL_BULK');
  const canDeleteGuest = hasPerm('DELETE_GUEST');

  const formatPhone = (input) => {
    if (!input) return '';
    let str = String(input).trim();
    if (!str) return '';

    str = str.replace(/\.0+$/, '');

    let extension = '';
    const extMatch = str.match(/(?:ext|extensión|ext|x|extension|\#)\.?\s*(\d+)/i);
    if (extMatch) {
      extension = ` Ext. ${extMatch[1]}`;
      str = str.substring(0, extMatch.index).trim();
    }

    const isInternationalWithPlus = str.startsWith('+');
    let digits = str.replace(/[^\d]/g, '');

    if (!digits) return input;

    if (digits.length === 8) {
      return `+502 ${digits.substring(0, 4)}-${digits.substring(4)}${extension}`;
    }
    if (digits.length === 11 && digits.startsWith('502')) {
      const num = digits.substring(3);
      return `+502 ${num.substring(0, 4)}-${num.substring(4)}${extension}`;
    }
    if (isInternationalWithPlus || digits.length > 8) {
      if (digits.startsWith('00')) {
        digits = digits.substring(2);
      }
      if (isInternationalWithPlus || !digits.startsWith('502')) {
        if (digits.length === 11 && digits.startsWith('1')) {
          return `+1 (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}${extension}`;
        }
        return `+${digits.substring(0, digits.length - 8)} ${digits.substring(digits.length - 8, digits.length - 4)}-${digits.substring(digits.length - 4)}${extension}`;
      }
    }
    return `${str}${extension}`;
  };

  const [submissions, setSubmissions] = useState([]);
  const [summary, setSummary] = useState({ total_submissions: 0, confirmed_count: 0, pending_count: 0, declined_count: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [eventFormConfig, setEventFormConfig] = useState(null);

  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'vip' | 'public'
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrModalGuest, setQrModalGuest] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waConnectionStatus, setWaConnectionStatus] = useState('LOADING'); // LOADING | QR_READY | CONNECTED
  const [waQrCodeBase64, setWaQrCodeBase64] = useState('');
  const [waForm] = Form.useForm();
  const [selectedWaGuest, setSelectedWaGuest] = useState(null);
  const [waLoading, setWaLoading] = useState(false);

  const isGenericCat = (name) => {
    if (!name) return true;
    const n = name.trim().toLowerCase();
    return n.includes('sin categor');
  };

  const fetchCategories = async () => {
    if (!selectedEventId) return;
    try {
      const res = await api.events.getCategories(selectedEventId);
      let list = [];
      if (res && Array.isArray(res)) list = res;
      else if (res && res.data && Array.isArray(res.data)) list = res.data;
      setCategories(list.filter(c => c && c.name && !isGenericCat(c.name)));
    } catch (e) {
      console.error('Error cargando categorías:', e);
    }
  };

  const handleOpenEditGuest = (record) => {
    setEditingGuest(record);
    editForm.resetFields();
    editForm.setFieldsValue({
      guest_name: record.guest_name || record.full_name || `${record.first_name || ''} ${record.last_name || ''}`.trim(),
      guest_email: record.guest_email || record.email || '',
      phone: record.phone || record.additional_data?.phone || '',
      company: record.company || record.guest_company || record.empresa || record.additional_data?.empresa || record.additional_data?.company || '',
      job_title: record.job_title || record.additional_data?.cargo || record.additional_data?.job_title || '',
      category_id: record.category_id || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEditGuest = async (values) => {
    if (!editingGuest) return;
    try {
      let res;
      if (editingGuest.is_imported || editingGuest.invitation_id) {
        const targetId = editingGuest.invitation_id || editingGuest.id;
        res = await api.invitations.update(targetId, values);
      } else {
        res = await api.attendees.update(editingGuest.id, values);
      }

      if (res.success) {
        message.success('Datos del invitado actualizados correctamente.');
        setShowEditModal(false);
        fetchCategories();
        fetchSubmissions(true);
      } else {
        message.error('Error actualizando invitado: ' + (res.error || 'Intente de nuevo.'));
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  // Realtime Polling State
  const [realtimeActive, setRealtimeActive] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchSubmissions = async (silent = false) => {
    if (!selectedEventId) return;
    if (!silent) setLoading(true);
    else setIsSyncing(true);

    try {
      const res = await api.invitations.listByEvent(selectedEventId, { search: '', status: '' });
      if (res.success && res.data) {
        setSubmissions(res.data);
        if (res.summary) setSummary(res.summary);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
      setIsSyncing(false);
    }
  };

  // Initial Load + Auto Refresh
  useEffect(() => {
    fetchSubmissions(false);
    fetchCategories();

    if (selectedEventId) {
      api.events.getById(selectedEventId)
        .then((res) => {
          if (res.success && res.data) {
            setEventFormConfig(res.data.form_config || null);
          }
        })
        .catch(console.error);
    }

    const interval = setInterval(() => {
      fetchSubmissions(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedEventId]);

  const handleCreateSingle = async (values) => {
    try {
      const res = await api.invitations.create(selectedEventId, values);
      if (res.success) {
        message.success('Invitación creada exitosamente.');
        setShowSingleModal(false);
        form.resetFields();
        fetchSubmissions(false);
      } else {
        message.error('Error: ' + res.error);
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleImportCSV = async () => {
    if (fileList.length === 0) {
      message.warning('Por favor seleccione un archivo Excel o CSV.');
      return;
    }

    setUploading(true);
    try {
      const targetFile = fileList[0].originFileObj || fileList[0];
      const res = await api.invitations.importCSV(selectedEventId, targetFile);
      if (res.success !== false) {
        const updateCount = res.updated_count ?? 0;
        const createCount = res.created_count ?? 0;
        const totalCount = res.count ?? (res.data?.count || res.imported_count || (updateCount + createCount));

        message.success(res.message || `Proceso completado: ${updateCount} invitado(s) actualizados y ${createCount} nuevos creado(s).`);
        setShowImportModal(false);
        setFileList([]);
        await fetchCategories();
        await fetchSubmissions(false);
      } else {
        message.error('Error al importar: ' + (res.error || 'Verifique el formato del archivo.'));
      }
    } catch (err) {
      message.error('Error procesando archivo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStatus = async (record, newStatus) => {
    try {
      const res = await api.invitations.updateStatus(record.id, newStatus);
      if (res.success) {
        message.success(`Estado actualizado a "${newStatus === 'confirmed' ? 'Registrado / Confirmado' : newStatus === 'declined' ? 'Rechazado' : 'Pendiente'}".`);
        fetchSubmissions(true);
      } else {
        message.error('No se pudo actualizar estado: ' + (res.error || 'Intente de nuevo.'));
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleRegenerate = async (id) => {
    try {
      const res = await api.invitations.regenerate(id);
      if (res.success) {
        message.success('Nuevo código generado: ' + res.data.code);
        fetchSubmissions(true);
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleDeleteGuest = async (record) => {
    try {
      let deleted = false;
      if (record.invitation_id) {
        const res = await api.invitations.delete(record.invitation_id);
        if (res.success) deleted = true;
      }
      if (record.attendee_id) {
        const resAtt = await api.attendees.delete(record.attendee_id);
        if (resAtt.success) deleted = true;
      }
      if (!deleted && record.id) {
        try {
          const res = await api.invitations.delete(record.id);
          if (res.success) deleted = true;
        } catch (e) {
          const resAtt = await api.attendees.delete(record.id);
          if (resAtt.success) deleted = true;
        }
      }

      if (deleted) {
        message.success('Invitado eliminado correctamente.');
        fetchSubmissions(true);
      } else {
        message.error('No se pudo eliminar el invitado.');
      }
    } catch (err) {
      message.error('Error al eliminar invitado: ' + err.message);
    }
  };

  const handleManualCheckin = async (record) => {
    try {
      const targetId = record.attendee_id || record.id;
      const res = await api.checkin.manualMark(selectedEventId, targetId);
      if (res.success !== false) {
        message.success(`✅ Asistencia registrada para ${record.guest_name || record.full_name || record.first_name || 'el invitado'}`);
        fetchSubmissions(true);
      } else {
        message.error(res.error || res.message || 'Error registrando asistencia.');
      }
    } catch (err) {
      message.error(err.message);
    }
  };

  // WhatsApp connection polling
  useEffect(() => {
    let intervalId;
    
    const checkWaStatus = async () => {
      try {
        const res = await api.whatsapp.getStatus();
        if (res.status === 'CONNECTED') {
          setWaConnectionStatus('CONNECTED');
        } else if (res.status === 'QR_READY') {
          setWaConnectionStatus('QR_READY');
          setWaQrCodeBase64(res.qr);
        } else {
          // Could be CONNECTING or something else
          setWaConnectionStatus('LOADING');
        }
      } catch (err) {
        console.error('Error fetching WA status:', err);
      }
    };

    if (waModalOpen && waConnectionStatus !== 'CONNECTED') {
      checkWaStatus(); // check immediately
      intervalId = setInterval(checkWaStatus, 3000); // poll every 3 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [waModalOpen, waConnectionStatus]);

  const handleOpenWaModal = (record) => {
    setSelectedWaGuest(record);
    const phone = record.phone || (record.additional_data && record.additional_data.phone) || '';
    waForm.setFieldsValue({ phone });
    setWaModalOpen(true);
    // Connection status will be set by the useEffect polling
    setWaConnectionStatus('LOADING');
  };

  const handleLogoutWa = async () => {
    try {
      setWaConnectionStatus('LOADING');
      await api.whatsapp.logout();
      setWaConnectionStatus('LOADING'); // This will trigger the useEffect to fetch the new QR
    } catch (e) {
      message.error('Error al desvincular WhatsApp: ' + e.message);
    }
  };

  const handleSendWa = async (values) => {
    if (!selectedWaGuest) return;
    setWaLoading(true);
    try {
      const targetId = selectedWaGuest.attendee_id || selectedWaGuest.id;
      const res = await api.attendees.sendWhatsApp(targetId, values.phone);
      if (res.success) {
        message.success(res.message || '✅ WhatsApp enviado exitosamente.');
        setWaModalOpen(false);
      } else {
        message.error('Error al enviar WhatsApp: ' + (res.error || 'Ocurrió un problema.'));
      }
    } catch (err) {
      message.error('Error al enviar WhatsApp: ' + err.message);
    } finally {
      setWaLoading(false);
    }
  };

  const handleResendSingleQR = async (record) => {
    try {
      const targetId = record.attendee_id || record.id;
      const res = await api.invitations.resendQREmail(selectedEventId, targetId, record.email);
      if (res.success) {
        message.success(res.message || '✅ Correo con código QR reenviado exitosamente.');
      } else {
        message.error('Error al reenviar correo: ' + (res.error || 'Ocurrió un problema.'));
      }
    } catch (err) {
      message.error('Error al reenviar correo: ' + err.message);
    }
  };

  const handleResendBulkQR = () => {
    const confirmedCount = submissions.filter(i => (i.status === 'confirmed' || i.status === 'checked_in') && (i.email || i.guest_email)).length;
    if (confirmedCount === 0) {
      message.warning('No hay invitados confirmados con correo electrónico registrado para reenviar su código QR.');
      return;
    }

    Modal.confirm({
      title: '📧 Reenviar Correos con QR a Confirmados',
      content: `¿Estás seguro de reenviar el correo con código QR a los ${confirmedCount} invitado(s) que ya han completado su confirmación / preregistro?`,
      okText: 'Sí, Reenviar Correos',
      cancelText: 'Cancelar',
      okButtonProps: { style: { backgroundColor: '#2563eb', borderColor: '#2563eb' } },
      onOk: async () => {
        try {
          const res = await api.invitations.resendQREmailBulk(selectedEventId);
          if (res.success) {
            message.success(res.message || `✅ Reenvío completado: correos enviados a ${res.sent_count || confirmedCount} invitados.`);
          } else {
            message.error('Error en el reenvío masivo: ' + (res.error || 'Ocurrió un problema.'));
          }
        } catch (err) {
          message.error('Error en el reenvío masivo: ' + err.message);
        }
      }
    });
  };

  const downloadQRImage = (guestName) => {
    const container = document.getElementById('guest-qr-download-container');
    const canvas = container?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      const cleanName = (guestName || 'invitado').replace(/[^a-zA-Z0-9_\-]/g, '_');
      a.download = `QR_${cleanName}.png`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      message.success('Código QR descargado exitosamente.');
    } else {
      message.error('No se pudo generar la imagen del código QR.');
    }
  };

  const getGuestLink = (inv) => {
    const code = inv.invitation_code || inv.code || inv.qr_code;
    const baseLink = `${window.location.origin}/public/events/${selectedEventId}`;
    return code ? `${baseLink}#${code}` : baseLink;
  };

  const copyLink = (inv) => {
    const link = getGuestLink(inv);
    const code = inv.invitation_code || inv.code || inv.qr_code;
    navigator.clipboard.writeText(link);
    setCopiedCode(code || 'link');
    message.success('¡Enlace de invitación copiado!');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const openLinkInNewTab = (inv) => {
    const link = getGuestLink(inv);
    window.open(link, '_blank');
  };

  // Helper check if record is VIP / imported vs Public Web Registration
  const checkIsVip = (record) => {
    if (record.is_public_registration === true) return false;
    if (record.is_imported === true || record.is_public_registration === false || !!record.invitation_id) return true;
    return false;
  };

  // Filtering Logic
  const filteredSubmissions = submissions.filter(item => {
    const isVip = checkIsVip(item);
    if (typeFilter === 'vip' && !isVip) return false;
    if (typeFilter === 'public' && isVip) return false;

    if (statusFilter && item.status !== statusFilter) return false;

    if (categoryFilter) {
      const catId = item.category_id;
      const catName = item.internal_category || item.category_name || item.event_categories?.name;
      const selectedCatObj = categories.find(c => c.id === categoryFilter);
      const selectedName = selectedCatObj ? selectedCatObj.name : categoryFilter;

      if (categoryFilter === 'none') {
        if (catId || (catName && categories.some(c => c.name.toLowerCase() === catName.toLowerCase()))) return false;
      } else {
        const matchesId = catId && catId === categoryFilter;
        const matchesName = catName && (catName === categoryFilter || catName === selectedName);
        if (!matchesId && !matchesName) return false;
      }
    }

    if (search) {
      const normalizeStr = (s) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const queryNorm = normalizeStr(search);
      const tokens = queryNorm.split(/\s+/).filter(Boolean);

      const fullName = normalizeStr(item.full_name || item.guest_name || `${item.first_name || ''} ${item.last_name || ''}`);
      const email = normalizeStr(item.email || item.guest_email);
      const company = normalizeStr(item.company || item.guest_company || item.empresa || item.additional_data?.empresa || item.additional_data?.company);
      const jobTitle = normalizeStr(item.job_title || item.puesto || item.cargo || item.additional_data?.cargo || item.additional_data?.job_title);
      const phone = normalizeStr(item.phone || item.telefono || item.celular || item.additional_data?.phone || item.additional_data?.telefono);
      const code = normalizeStr(item.code || item.invitation_code || item.qr_code);
      const internalCat = normalizeStr(item.internal_category || item.category_name || item.event_categories?.name);
      const formCat = normalizeStr(item.form_category || item.additional_data?.categoria || item.additional_data?.tipo);

      let addDataValues = '';
      if (item.additional_data && typeof item.additional_data === 'object') {
        addDataValues = normalizeStr(Object.values(item.additional_data).join(' '));
      }

      const searchableText = `${fullName} ${email} ${company} ${jobTitle} ${phone} ${code} ${internalCat} ${formCat} ${addDataValues}`;
      const matchesAllTokens = tokens.every(token => searchableText.includes(token));
      if (!matchesAllTokens) return false;
    }
    return true;
  });

  // Calculate Metrics
  const vipSubmissions = submissions.filter(checkIsVip);
  const publicSubmissions = submissions.filter(item => !checkIsVip(item));

  const vipTotal = vipSubmissions.length;
  const vipConfirmed = vipSubmissions.filter(i => i.status === 'confirmed' || i.attended).length;
  const vipPending = vipSubmissions.filter(i => (!i.status || i.status === 'pending') && !i.attended).length;
  const publicTotal = publicSubmissions.length;

  const getFlexibleValue = (obj, fieldId, fieldLabel) => {
    if (!obj || typeof obj !== 'object') return null;

    if (fieldId && obj[fieldId] !== undefined && obj[fieldId] !== null && String(obj[fieldId]).trim() !== '') {
      return obj[fieldId];
    }
    if (fieldLabel && obj[fieldLabel] !== undefined && obj[fieldLabel] !== null && String(obj[fieldLabel]).trim() !== '') {
      return obj[fieldLabel];
    }

    const normTargetId = fieldId ? String(fieldId).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
    const normTargetLabel = fieldLabel ? String(fieldLabel).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      const normKey = String(key).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      if ((normTargetId && normKey === normTargetId) || (normTargetLabel && normKey === normTargetLabel)) {
        return value;
      }
      if ((normTargetId && normTargetId.length > 2 && normKey.includes(normTargetId)) ||
          (normTargetLabel && normTargetLabel.length > 2 && normKey.includes(normTargetLabel))) {
        return value;
      }
    }

    return null;
  };

  // 1. Guaranteed Core Form Columns (Empresa, Cargo, Teléfono, Categoría del Formulario)
  const baseFormColumns = [
    {
      title: 'Empresa',
      key: 'company',
      render: (_, record) => {
        const addData = record.additional_data || {};
        const comp = record.company || record.guest_company || record.empresa || getFlexibleValue(addData, 'company', 'empresa') || getFlexibleValue(addData, 'empresa', 'organización') || getFlexibleValue(addData, 'organizacion', 'company_name');
        if (!comp) return <Text type="secondary" style={{ color: '#94a3b8' }}>—</Text>;
        return <Text strong style={{ color: '#1e293b' }}>{String(comp)}</Text>;
      }
    },
    {
      title: 'Cargo / Puesto',
      key: 'job_title',
      render: (_, record) => {
        const addData = record.additional_data || {};
        const job = record.job_title || getFlexibleValue(addData, 'job_title', 'cargo') || getFlexibleValue(addData, 'cargo', 'puesto') || getFlexibleValue(addData, 'puesto', 'job');
        if (!job) return <Text type="secondary" style={{ color: '#94a3b8' }}>—</Text>;
        return <Text style={{ fontSize: '0.85rem', color: '#475569' }}>{String(job)}</Text>;
      }
    },
    {
      title: 'Teléfono',
      key: 'phone',
      render: (_, record) => {
        const addData = record.additional_data || {};
        const ph = record.phone || record.telefono || getFlexibleValue(addData, 'phone', 'teléfono') || getFlexibleValue(addData, 'telefono', 'celular') || getFlexibleValue(addData, 'movil', 'número de teléfono');
        if (!ph) return <Text type="secondary" style={{ color: '#94a3b8' }}>—</Text>;
        return (
          <Text style={{ fontSize: '0.85rem', fontWeight: '500', color: '#1e293b' }}>
            <PhoneOutlined style={{ marginRight: '6px', color: '#10b981' }} />
            {formatPhone(ph)}
          </Text>
        );
      }
    },
    {
      title: 'Categoría del Formulario',
      key: 'form_category',
      render: (_, record) => {
        const addData = record.additional_data || {};
        const formCat = record.form_category || 
                        getFlexibleValue(addData, 'categoria', 'category') || 
                        getFlexibleValue(addData, 'tipo', 'categoría_formulario') || 
                        getFlexibleValue(addData, 'categoria_formulario', 'categoría') || 
                        record.category_name || 
                        record.internal_category;
        if (!formCat) return <Text type="secondary" style={{ color: '#94a3b8' }}>—</Text>;
        return (
          <Tag color="cyan" style={{ borderRadius: '4px', fontWeight: '500' }}>
            🌐 {String(formCat)}
          </Tag>
        );
      }
    }
  ];

  // 2. Additional Custom Fields from eventFormConfig.custom_fields (e.g. Categoria custom dropdown, DPI, Acompañante, etc.)
  const customFormColumns = [];
  if (eventFormConfig && Array.isArray(eventFormConfig.custom_fields)) {
    eventFormConfig.custom_fields.forEach(cf => {
      if (cf.visible === false) return;
      const normId = String(cf.id).toLowerCase();
      const normLabel = String(cf.label || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // Skip if custom field is semantically Empresa, Phone, or Cargo (already in baseFormColumns with fallbacks)
      if (normId.includes('company') || normId === 'empresa' || normLabel.includes('empresa') || normLabel.includes('company') || normLabel.includes('organiza')) return;
      if (normId.includes('phone') || normId.includes('telef') || normId.includes('celular') || normLabel.includes('telef') || normLabel.includes('phone') || normLabel.includes('celular') || normLabel.includes('movil')) return;
      if (normId.includes('job') || normId.includes('cargo') || normId.includes('puesto') || normLabel.includes('cargo') || normLabel.includes('puesto')) return;

      customFormColumns.push({
        title: cf.label || cf.id,
        key: cf.id,
        render: (_, record) => {
          let val = getFlexibleValue(addData, cf.id, cf.label) || record[cf.id];
          
          // Si el campo personalizado es Categoria y aún no tiene respuesta de formulario, usar categoría interna del invitado
          if ((val === undefined || val === null || String(val).trim() === '') && (normLabel.includes('categor') || normId.includes('categor'))) {
            val = record.form_category || record.category_name || record.internal_category || (record.event_categories ? record.event_categories.name : null);
          }

          if (val === undefined || val === null || String(val).trim() === '') {
            return <Text type="secondary" style={{ color: '#94a3b8' }}>—</Text>;
          }
          return (
            <Tag color="cyan" style={{ borderRadius: '4px', fontWeight: '500' }}>
              {String(val)}
            </Tag>
          );
        }
      });
    });
  }

  const columns = [
    {
      title: 'Nombre Completo',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (text, record) => {
        const name = text || record.guest_name || `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'Invitado';
        const email = record.email || record.guest_email;
        return (
          <div>
            <Text strong style={{ display: 'block' }}>{name}</Text>
            {email && (
              <Text type="secondary" style={{ fontSize: '0.78rem', display: 'block' }}>
                {email}
              </Text>
            )}
          </div>
        );
      }
    },
    {
      title: 'Origen de Lista',
      key: 'origin',
      render: (_, record) => {
        const isVip = checkIsVip(record);
        if (isVip) {
          return <Tag color="gold" icon={<StarOutlined />} style={{ fontWeight: 'bold' }}>⭐ VIP (Excel/CSV)</Tag>;
        }
        return <Tag color="blue" icon={<GlobalOutlined />}>🌐 Registro Web Público</Tag>;
      }
    },
    {
      title: 'Categoría Interna',
      key: 'internal_category',
      render: (_, record) => {
        const rawCatName = record.internal_category || record.category_name || (record.event_categories ? record.event_categories.name : null);
        if (!rawCatName || isGenericCat(rawCatName)) {
          return <Tag color="default" style={{ borderRadius: '4px' }}>Sin Categoría</Tag>;
        }
        return (
          <Tag color="purple" icon={<TagOutlined />} style={{ fontWeight: 'bold', borderRadius: '4px' }}>
            {rawCatName}
          </Tag>
        );
      }
    },
    ...baseFormColumns,
    ...customFormColumns,
    {
      title: 'Estado de Registro / RSVP',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const isVip = checkIsVip(record);
        const currentStatus = status || (record.is_active === false ? 'declined' : 'pending');
        
        if (!canEditGuestRSVP) {
          return (
            <Tag color={currentStatus === 'confirmed' ? 'green' : currentStatus === 'declined' ? 'red' : 'orange'}>
              {currentStatus === 'confirmed' ? (isVip ? 'VIP Registrado' : 'Confirmado') : currentStatus === 'declined' ? 'Cancelado' : 'Pendiente'}
            </Tag>
          );
        }

        return (
          <Select
            value={currentStatus}
            size="small"
            onChange={(val) => handleUpdateStatus(record, val)}
            style={{ minWidth: '150px' }}
          >
            <Select.Option value="confirmed">
              <Tag color="green" style={{ border: 'none', margin: 0 }}>🟢 {isVip ? 'VIP Registrado' : 'Confirmado'}</Tag>
            </Select.Option>
            <Select.Option value="pending">
              <Tag color="orange" style={{ border: 'none', margin: 0 }}>🟡 {isVip ? 'Pendiente Registro' : 'Pendiente'}</Tag>
            </Select.Option>
            <Select.Option value="declined">
              <Tag color="red" style={{ border: 'none', margin: 0 }}>🔴 Cancelado / No Asistirá</Tag>
            </Select.Option>
          </Select>
        );
      }
    },
    {
      title: 'Código / QR',
      dataIndex: 'invitation_code',
      key: 'invitation_code',
      render: (code, record) => {
        const displayCode = code || record.qr_code || record.code;
        if (!displayCode) {
          return <Tag color="orange" style={{ fontWeight: '500' }}>🟡 Pendiente (Sin QR)</Tag>;
        }
        return (
          <Text copyable style={{ fontFamily: 'monospace', fontWeight: 'bold', backgroundColor: '#f4f5f7', padding: '2px 8px', borderRadius: '4px' }}>
            {displayCode}
          </Text>
        );
      }
    },
    {
      title: 'Asistencia Manual',
      key: 'manual_checkin',
      render: (_, record) => {
        const hasCheckedIn = record.status === 'checked_in' || record.checked_in === true || (record.checkins && record.checkins.length > 0);
        if (hasCheckedIn) {
          return <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontWeight: '600', padding: '4px 10px' }}>🟢 Asistió</Tag>;
        }
        if (!canMarkAttendance) {
          return <Tag color="default">No Autorizado</Tag>;
        }
        return (
          <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handleManualCheckin(record)}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontWeight: '600' }}
          >
            Marcar Asistencia
          </Button>
        );
      }
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {canViewQR && (
            <Tooltip title="Ver y Descargar Código QR">
              <Button
                size="small"
                icon={<QrcodeOutlined style={{ color: '#c3302d' }} />}
                onClick={() => {
                  setQrModalGuest(record);
                  setQrModalVisible(true);
                }}
              />
            </Tooltip>
          )}
          {canCopyLink && (
            <Popover
              trigger="click"
              placement="top"
              content={
                <div style={{ padding: '4px 2px', minWidth: '150px' }}>
                  <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', color: '#475569' }}>
                    Enlace Personalizado
                  </Text>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Button
                      size="small"
                      type="primary"
                      icon={copiedCode === (record.invitation_code || record.code || record.qr_code) ? <CheckOutlined /> : <CopyOutlined />}
                      onClick={() => copyLink(record)}
                      style={{ width: '100%', backgroundColor: '#1e293b', borderColor: '#1e293b' }}
                    >
                      Copiar Enlace
                    </Button>
                    <Button
                      size="small"
                      icon={<ExportOutlined />}
                      onClick={() => openLinkInNewTab(record)}
                      style={{ width: '100%' }}
                    >
                      Abrir en otra pestaña
                    </Button>
                  </Space>
                </div>
              }
            >
              <Button
                size="small"
                icon={copiedCode === (record.invitation_code || record.code || record.qr_code) ? <CheckOutlined style={{ color: '#10b981' }} /> : <CopyOutlined />}
              />
            </Popover>
          )}
          {canEditGuestInfo && (
            <Tooltip title="Editar Datos del Invitado">
              <Button
                size="small"
                icon={<EditOutlined style={{ color: '#0284c7' }} />}
                onClick={() => handleOpenEditGuest(record)}
              />
            </Tooltip>
          )}
          {canResendSingleQR && (record.status === 'confirmed' || record.status === 'checked_in') && (
            <Tooltip title="Reenviar Correo con Código QR">
              <Button
                size="small"
                icon={<MailOutlined style={{ color: '#0284c7' }} />}
                onClick={() => handleResendSingleQR(record)}
              />
            </Tooltip>
          )}
          {(record.status === 'confirmed' || record.status === 'checked_in') && (
            <Tooltip title="Enviar QR por WhatsApp">
              <Button
                size="small"
                icon={<WhatsAppOutlined style={{ color: '#25D366' }} />}
                onClick={() => handleOpenWaModal(record)}
              />
            </Tooltip>
          )}
          {canRegenerateQR && (
            <Tooltip title="Regenerar Código QR">
              <Popconfirm
                title="¿Regenerar código?"
                description="El código anterior dejará de ser válido."
                onConfirm={() => handleRegenerate(record.id)}
                okText="Sí, regenerar"
                cancelText="Cancelar"
              >
                <Button size="small" icon={<ReloadOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
          {canDeleteGuest && (
            <Tooltip title="Eliminar Invitado">
              <Popconfirm
                title="¿Eliminar invitado?"
                description="¿Estás seguro de eliminar a este invitado? Esta acción enviará el registro a la papelera."
                onConfirm={() => handleDeleteGuest(record)}
                okText="Sí, eliminar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          {!embedded && (
            <Title level={3} style={{ margin: 0, fontWeight: '700' }}>
              Gestión de Invitados VIP y Preregistros Públicos
            </Title>
          )}
        </div>

        <Space wrap>
          {canResendBulkQR && (
            <Button
              icon={<SendOutlined style={{ color: '#0284c7' }} />}
              size="middle"
              onClick={handleResendBulkQR}
              style={{ fontWeight: '600', borderColor: '#cbd5e1', color: '#334155' }}
            >
              Reenviar QR a Confirmados
            </Button>
          )}
          {canImportExcel && (
            <Button icon={<UploadOutlined />} size={embedded ? "middle" : "large"} onClick={() => setShowImportModal(true)}>
              Cargar Excel / CSV
            </Button>
          )}
          {canAddSingle && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              size={embedded ? "middle" : "large"}
              onClick={() => setShowSingleModal(true)}
              style={{ backgroundColor: '#c3302d', borderColor: '#c3302d', fontWeight: '700' }}
            >
              Agregar Invitado VIP
            </Button>
          )}
        </Space>
      </div>

      {/* Summary Metrics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col xs={24} sm={12} md={4}>
          <Card size="small" style={{ borderRadius: '8px', borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <Text type="secondary" style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Total General</Text>
            <Title level={3} style={{ margin: 0 }}>{submissions.length}</Title>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={5}>
          <Card size="small" style={{ borderRadius: '8px', borderLeft: '4px solid #6366f1', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <Text type="secondary" style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700' }}>Registros Web Públicos</Text>
            <Title level={3} style={{ margin: 0, color: '#6366f1' }}>{publicTotal}</Title>
          </Card>
        </Col>
      </Row>

      {/* Segmented Division Switcher */}
      <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Text strong style={{ fontSize: '0.82rem', color: '#475569' }}>Filtrar División de Asistentes:</Text>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
            <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
              <Segmented
                size="middle"
                options={[
                  { label: `Todos los Invitados (${submissions.length})`, value: 'all' },
                  { label: `Invitados VIP por Excel (${vipTotal})`, value: 'vip' },
                  { label: `Registros Web Públicos (${publicTotal})`, value: 'public' }
                ]}
                value={typeFilter}
                onChange={setTypeFilter}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', width: '100%', maxWidth: '100%' }}>
              <Input
                placeholder="Buscar por nombre, correo, empresa..."
                prefix={<SearchOutlined style={{ color: '#89888a' }} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: '1 1 200px', minWidth: '160px' }}
                allowClear
              />
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ flex: '1 1 180px', minWidth: '150px' }}
                placeholder="Filtrar por Categoría Interna"
              >
                <Select.Option value="">🏷️ Categoría Interna: Todas</Select.Option>
                {categories.map(c => (
                  <Select.Option key={c.id} value={c.id}>🏷️ {c.name}</Select.Option>
                ))}
                <Select.Option value="none">Sin Categoría Interna</Select.Option>
              </Select>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ flex: '1 1 160px', minWidth: '140px' }}
              >
                <Select.Option value="">Todos los Estados</Select.Option>
                <Select.Option value="confirmed">Registrados / Confirmados</Select.Option>
                <Select.Option value="pending">Pendientes de Registro</Select.Option>
                <Select.Option value="declined">Cancelados</Select.Option>
              </Select>
              <Button icon={<ReloadOutlined />} onClick={() => { fetchCategories(); fetchSubmissions(false); }}>
                Refrescar
              </Button>
            </div>
          </div>
        </Space>
      </div>

      <Card bordered={false} style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRadius: '10px' }}>
        <Table
          dataSource={filteredSubmissions.map(i => ({ ...i, key: i.id }))}
          columns={columns}
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10, responsive: true }}
        />
      </Card>

      {/* Modal Crear Invitación Single */}
      <Modal
        title={<Title level={4} style={{ margin: 0 }}>Agregar Invitado VIP Manual</Title>}
        open={showSingleModal}
        onCancel={() => setShowSingleModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" onFinish={handleCreateSingle} style={{ marginTop: '16px' }}>
          <Form.Item name="guest_name" label="Nombre Completo" rules={[{ required: true, message: 'Ingrese el nombre' }]}>
            <Input placeholder="Ej: Diego Medina" />
          </Form.Item>
          <Form.Item name="guest_email" label="Correo Electrónico (Opcional)" rules={[{ type: 'email', message: 'Ingrese un correo válido' }]}>
            <Input placeholder="ejemplo@empresa.com (opcional)" />
          </Form.Item>
          <Form.Item name="category_id" label="Categoría del Invitado">
            <Select placeholder="Seleccionar categoría..." allowClear>
              {categories.map(c => (
                <Select.Option key={c.id} value={c.id}>🏷️ {c.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="phone" label="Número de Teléfono (Opcional)">
            <Input placeholder="Ej: +502 5555 1234" />
          </Form.Item>
          <Form.Item name="company" label="Empresa (Opcional)">
            <Input placeholder="Ej: Íntegro Desarrolladora" />
          </Form.Item>
          <Form.Item name="job_title" label="Cargo (Opcional)">
            <Input placeholder="Ej: Director Comercial" />
          </Form.Item>
          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={() => setShowSingleModal(false)}>Cancelar</Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#c3302d', borderColor: '#c3302d' }}>
                Guardar Invitado VIP
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Modal Editar Invitado */}
      <Modal
        title={<Title level={4} style={{ margin: 0 }}>Editar Datos del Invitado</Title>}
        open={showEditModal}
        onCancel={() => setShowEditModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleSaveEditGuest} style={{ marginTop: '16px' }}>
          <Form.Item name="guest_name" label="Nombre Completo" rules={[{ required: true, message: 'Ingrese el nombre' }]}>
            <Input placeholder="Ej: Diego Medina" />
          </Form.Item>
          <Form.Item name="guest_email" label="Correo Electrónico (Opcional)" rules={[{ type: 'email', message: 'Ingrese un correo válido' }]}>
            <Input placeholder="ejemplo@empresa.com (opcional)" />
          </Form.Item>
          <Form.Item name="category_id" label="Categoría del Invitado">
            <Select placeholder="Seleccionar categoría..." allowClear>
              {categories.map(c => (
                <Select.Option key={c.id} value={c.id}>🏷️ {c.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="phone" label="Número de Teléfono (Opcional)">
            <Input placeholder="Ej: +502 5555 1234" />
          </Form.Item>
          <Form.Item name="company" label="Empresa (Opcional)">
            <Input placeholder="Ej: Íntegro Desarrolladora" />
          </Form.Item>
          <Form.Item name="job_title" label="Cargo (Opcional)">
            <Input placeholder="Ej: Director Comercial" />
          </Form.Item>
          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={() => setShowEditModal(false)}>Cancelar</Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#c3302d', borderColor: '#c3302d' }}>
                Actualizar Invitado
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Modal Importar Excel / CSV */}
      <Modal
        title={
          <Space>
            <FileExcelOutlined style={{ color: '#10b981', fontSize: '1.4rem' }} />
            <Title level={4} style={{ margin: 0 }}>Cargar Lista Masiva de Invitados (Excel / CSV)</Title>
          </Space>
        }
        open={showImportModal}
        onCancel={() => { setShowImportModal(false); setFileList([]); }}
        footer={[
          <Button key="back" onClick={() => { setShowImportModal(false); setFileList([]); }}>
            Cancelar
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={uploading}
            onClick={handleImportCSV}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontWeight: 'bold' }}
          >
            Comenzar Importación / Actualización
          </Button>
        ]}
      >
        <div style={{ margin: '16px 0' }}>
          <Alert
            message="Re-importación Segura (Conserva Confirmaciones)"
            description="Si el archivo Excel contiene la columna 'Categoría', se asignará la Categoría Interna. Si el invitado con el mismo Nombre y Correo ya confirmó o registró su asistencia previamente, su estado de confirmación, QR y acompañantes se mantendrán 100% intactos, asignándole únicamente su Categoría Interna sin duplicar ni borrar registros."
            type="success"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          <Text type="secondary" style={{ display: 'block', marginBottom: '12px' }}>
            Suba un archivo con columnas <strong>Nombre, Correo, Categoría, Empresa, Cargo</strong>.
          </Text>
          <Upload
            beforeUpload={(file) => {
              setFileList([file]);
              return false; // Evita envío automático
            }}
            fileList={fileList}
            onRemove={() => setFileList([])}
            accept=".xlsx, .xls, .csv"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Seleccionar archivo Excel / CSV</Button>
          </Upload>
        </div>
      </Modal>

      {/* Modal Ver y Descargar QR de Invitado */}
      <Modal
        title={
          <Space>
            <QrcodeOutlined style={{ color: '#c3302d', fontSize: '1.2rem' }} />
            <Text strong style={{ fontSize: '1.1rem' }}>Código QR de Entrada</Text>
          </Space>
        }
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setQrModalVisible(false)}>
            Cerrar
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => downloadQRImage(qrModalGuest?.guest_name || qrModalGuest?.full_name || qrModalGuest?.name)}
            style={{ backgroundColor: '#c3302d', borderColor: '#c3302d', fontWeight: 'bold' }}
          >
            Descargar QR (.png)
          </Button>
        ]}
        width={380}
        centered
      >
        {qrModalGuest && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Title level={4} style={{ margin: 0, fontWeight: '700' }}>
              {qrModalGuest.guest_name || qrModalGuest.full_name || qrModalGuest.first_name || 'Invitado'}
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: '20px' }}>
              {qrModalGuest.guest_email || qrModalGuest.email || ''}
            </Text>

            <div id="guest-qr-download-container" style={{ display: 'inline-block', padding: '16px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
              <QRCode
                value={qrModalGuest.invitation_code || qrModalGuest.qr_code || qrModalGuest.code || 'N/A'}
                size={220}
                color="#111827"
                bordered={false}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <Text type="secondary" style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Código de Acceso:</Text>
              <Text strong style={{ display: 'block', fontFamily: 'monospace', fontSize: '1.1rem', color: '#c3302d', marginTop: '2px' }}>
                {qrModalGuest.invitation_code || qrModalGuest.qr_code || qrModalGuest.code || 'N/A'}
              </Text>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Enviar WhatsApp */}
      <Modal
        title={
          <Space>
            <WhatsAppOutlined style={{ color: '#25D366', fontSize: '1.2rem' }} />
            <Text strong>
              {waConnectionStatus === 'CONNECTED' ? 'Enviar Código QR por WhatsApp' : 'Vincular Dispositivo WhatsApp'}
            </Text>
          </Space>
        }
        open={waModalOpen}
        onCancel={() => setWaModalOpen(false)}
        footer={null}
      >
        {waConnectionStatus === 'LOADING' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <SyncOutlined spin style={{ fontSize: '32px', color: '#0284c7', marginBottom: '16px' }} />
            <Title level={5}>Verificando conexión...</Title>
            <Text type="secondary">Conectando con el motor de WhatsApp</Text>
          </div>
        )}

        {waConnectionStatus === 'QR_READY' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Alert
              message="Vinculación Requerida"
              description="Abre WhatsApp en tu teléfono, ve a 'Dispositivos Vinculados' y escanea este código QR."
              type="info"
              showIcon
              style={{ marginBottom: '24px', textAlign: 'left' }}
            />
            {waQrCodeBase64 ? (
              <img src={waQrCodeBase64} alt="WhatsApp QR Code" style={{ width: '250px', height: '250px', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            ) : (
              <SyncOutlined spin style={{ fontSize: '32px' }} />
            )}
            <div style={{ marginTop: '16px' }}>
              <Text type="secondary">Esperando escaneo...</Text>
            </div>
          </div>
        )}

        {waConnectionStatus === 'CONNECTED' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Alert
                message="WhatsApp Conectado"
                type="success"
                showIcon
                style={{ marginBottom: '16px' }}
                action={
                  <Button size="small" type="text" danger onClick={handleLogoutWa}>
                    Desvincular
                  </Button>
                }
              />
              <Text>
                Se enviará la imagen del Código QR de acceso a 
                <strong> {selectedWaGuest?.guest_name || selectedWaGuest?.full_name || selectedWaGuest?.first_name || 'este invitado'} </strong>
                al siguiente número.
              </Text>
            </div>
            <Form form={waForm} layout="vertical" onFinish={handleSendWa}>
              <Form.Item
                name="phone"
                label="Número de Teléfono (con código de país)"
                rules={[
                  { required: true, message: 'El número es requerido' }
                ]}
              >
                <Input placeholder="Ej. +502 12345678" prefix={<PhoneOutlined />} />
              </Form.Item>
              
              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setWaModalOpen(false)}>Cancelar</Button>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={waLoading}
                    style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                    icon={<SendOutlined />}
                  >
                    Enviar WhatsApp
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

    </div>
  );
}
