import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    IoMdArrowBack, IoMdSettings, IoMdMail, IoMdStats, IoMdDocument, IoMdLink, IoMdCode, IoMdCreate
} from "react-icons/io";

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { DashboardContent } from 'src/layouts/dashboard';
import { getEmailTemplate } from 'src/api/email-template';
import { fetchCrmEmailTemplateCategories } from 'src/api/masters';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

export function EmailTemplateDetailsView() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.email_templates;
    const displayEdit = hasCustomPerms ? !!user?.permissions?.actions?.email_templates?.edit : true;
    const displayDelete = hasCustomPerms ? !!user?.permissions?.actions?.email_templates?.delete : true;

    const [template, setTemplate] = useState<any>(null);
    const [fetching, setFetching] = useState(true);
    const [categories, setCategories] = useState<any[]>([]);
    const [isCodeView, setIsCodeView] = useState(false);
    const [isCodeViewFooter, setIsCodeViewFooter] = useState(false);

    const decodeHtml = (input: string | null | undefined) => {
        if (!input) return '';
        
        let workingStr = input.trim();

        if (workingStr.startsWith('<!--mode:html-->')) {
            workingStr = workingStr.slice('<!--mode:html-->'.length);
        } else if (workingStr.startsWith('<!--mode:plain-->')) {
            workingStr = workingStr.slice('<!--mode:plain-->'.length);
        }

        // 1. Strip surrounding Quill RichText container tags (<div class="ql-editor...">...</div> or similar) 
        // ONLY if the inner content is entity-encoded (meaning it is actually a code template written in Quill).
        const parser = new DOMParser();
        const doc = parser.parseFromString(workingStr, 'text/html');
        const qlEditor = doc.querySelector('.ql-editor');
        
        if (qlEditor) {
            const innerContent = qlEditor.innerHTML.trim();
            if (innerContent === '' || innerContent === '<p><br></p>') {
                return '';
            }
            if (innerContent.includes('&lt;') || innerContent.includes('&gt;') || innerContent.includes('&amp;')) {
                workingStr = innerContent;
            }
        } else if (workingStr === '<p><br></p>') {
            return '';
        }

        // 2. Decode entities. Since templates can be saved with multiple levels of escaping (e.g. &amp;lt;),
        // we run a decoding loop until no more change occurs, capped at 3 iterations to prevent infinite loops.
        let decoded = workingStr;
        let lastDecoded = '';
        let iterations = 0;
        
        const txt = document.createElement('textarea');
        while (decoded !== lastDecoded && decoded.includes('&') && iterations < 3) {
            lastDecoded = decoded;
            try {
                txt.innerHTML = decoded;
                decoded = txt.value;
            } catch (e) {
                break;
            }
            iterations++;
        }

        // 3. Normalize whitespace entities and remove Quill's paragraph tags wrapping HTML block code.
        // We replace standard non-breaking spaces that Quill injects into code formatting indentation.
        const cleaned = decoded
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&');

        // Parse HTML to cleanly unwrap any inline paragraph tags wrapper surrounding block-level tags.
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleaned;

        const paragraphs = tempDiv.querySelectorAll('p');
        paragraphs.forEach((p) => {
            // Unpack paragraphs containing tags (like div, table, a, hr, headers, styles)
            const hasHtmlTag = p.querySelector('*') || /<[a-z/][^>]*>/i.test(p.innerHTML);
            const innerHTMLTrimmed = p.innerHTML.trim();
            
            if (hasHtmlTag) {
                while (p.firstChild) {
                    p.parentNode?.insertBefore(p.firstChild, p);
                }
                p.parentNode?.removeChild(p);
            } else if (innerHTMLTrimmed === '<br>' || innerHTMLTrimmed === '&nbsp;' || innerHTMLTrimmed === '') {
                p.parentNode?.removeChild(p);
            }
        });

        // Clean up empty lines or double quotes escaped by raw database string representations.
        return tempDiv.innerHTML;
    };

    const decodedEmailContent = useMemo(() => decodeHtml((template as any)?.email_content), [(template as any)?.email_content]);
    const decodedFooterContent = useMemo(() => decodeHtml((template as any)?.footer_content), [(template as any)?.footer_content]);

    const isEmailSavedAsHtml = useMemo(() => ((template as any)?.email_content || '').startsWith('<!--mode:html-->'), [template]);
    const isFooterSavedAsHtml = useMemo(() => {
        if (!isEmailSavedAsHtml) return false;
        const footer = (template as any)?.footer_content || '';
        if (footer.startsWith('<!--mode:html-->')) return true;
        if (footer.startsWith('<!--mode:plain-->')) return false;
        return true;
    }, [template, isEmailSavedAsHtml]);

    useEffect(() => {
        fetchCrmEmailTemplateCategories({ page: 1, page_size: 1000 })
            .then((res) => {
                if (res && res.data) {
                    setCategories(res.data);
                }
            })
            .catch((err) => console.error('Failed to fetch categories:', err));
    }, []);

    useEffect(() => {
        if (id) {
            getEmailTemplate(id)
                .then((doc) => {
                    setTemplate(doc);
                    const email = doc.email_content || '';
                    const footer = doc.footer_content || '';
                    const emailIsHtml = email.startsWith('<!--mode:html-->');
                    const footerIsHtml = emailIsHtml && (footer.startsWith('<!--mode:html-->') || footer === '' || footer.startsWith('<!--mode:plain-->') === false);
                    if (emailIsHtml) {
                        setIsCodeView(true);
                    }
                    if (footerIsHtml) {
                        setIsCodeViewFooter(true);
                    }
                })
                .catch((err) => console.error('Failed to fetch template details:', err))
                .finally(() => setFetching(false));
        }
    }, [id]);

    if (fetching) {
        return (
            <DashboardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <CircularProgress />
            </DashboardContent>
        );
    }

    if (!template) {
        return (
            <DashboardContent maxWidth={false}>
                <Typography variant="h4">Template not found</Typography>
                <Button onClick={() => navigate(-1)} sx={{ mt: 3 }}>
                    Go back to list
                </Button>
            </DashboardContent>
        );
    }

    const {
        template_name,
        category,
        description,
        is_active,
        is_default,
        subject,
        sender_name,
        reply_to_email,
        email_content,
        footer_content,
        enable_open_tracking,
        enable_click_tracking,
        enable_unsubscribe,
        attachments = [],
        available_variables,
    } = template;

    

    let parsedAttachments: any[] = [];
    if (typeof attachments === 'string') {
        try {
            parsedAttachments = JSON.parse(attachments);
        } catch {
            parsedAttachments = [attachments];
        }
    } else if (Array.isArray(attachments)) {
        parsedAttachments = attachments;
    }

    return (
        <DashboardContent maxWidth={false}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Typography variant="h4">Template: {template_name || id}</Typography>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => navigate(-1)}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 2.5,
                            '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                                borderColor: 'text.primary',
                            }
                        }}
                    >
                        Go Back
                    </Button>
                    {displayEdit && 
                    ( 
                        <Button
                            variant="contained"
                            onClick={() => navigate(`/email-templates/${encodeURIComponent(id || '')}/edit`)}
                            startIcon={<IoMdCreate size={20} />}
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                bgcolor: '#059669',
                                color: 'common.white',
                                '&:hover': { bgcolor: '#047857' }
                            }}
                        >
                            Edit
                        </Button>
                    )}
                </Stack>
            </Stack>

            <Card sx={{ p: 4, borderRadius: 2 }}>
                <Box
                    sx={{
                        display: 'grid',
                        columnGap: 4,
                        rowGap: 4,
                        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
                    }}
                >
                    {/* Basic Information */}
                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                            <IoMdSettings size={18} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>Basic Information</Typography>
                        </Stack>
                        <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.06), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.18)}` }}>
                            <Stack spacing={1.5}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12}}>Template Name</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{template_name || '-'}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12}}>Category</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>
                                        {categories.find(c => c.name === category)?.category || category || '-'}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12}}>Description</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold', textAlign: 'right', maxWidth: '60%' }}>{description || '-'}</Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>

                    {/* Email Settings */}
                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                            <IoMdMail size={18} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>Email Settings</Typography>
                        </Stack>
                        <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.grey[500], 0.06), border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.18)}` }}>
                            <Stack spacing={1.5}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12}}>Sender Name</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{sender_name || '-'}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12}}>Reply To Email</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>{reply_to_email || '-'}</Typography>
                                </Stack>
                                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12}}>Is Active</Typography>
                                    <Chip label={is_active ? 'Yes' : 'No'} size="small" color={is_active ? 'success' : 'default'} sx={{ borderRadius: 1, p: 1 }} />
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12}}>Is Default</Typography>
                                    <Chip label={is_default ? 'Yes' : 'No'} size="small" color={is_default ? 'info' : 'default'} sx={{ borderRadius: 1, p: 1 }} />
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>


                    {/* Email Content */}
                    <Box sx={{ gridColumn: { md: 'span 2' } }}>
                        <Stack spacing={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                                <IoMdDocument size={18} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>Content</Typography>
                            </Stack>
                            <Box sx={{ p: 3, borderRadius: 1.5, bgcolor: (themeVar) => alpha(themeVar.palette.primary.main, 0.03),border: (themeVar) => `1px solid ${alpha(themeVar.palette.primary.main, 0.16)}` }}>
                                <Stack spacing={3}>
                                    <Stack spacing={1}>
                                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 13, fontWeight: 600 }}>Subject</Typography>
                                        <Box
                                            sx={{
                                                p: 2,
                                                bgcolor: 'background.paper',
                                                borderRadius: 1,
                                                border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                                                minHeight: 100,
                                            }}
                                        >
                                            <Typography variant="body2">
                                                {subject || '-'}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                    <Stack spacing={1}>
                                        <Stack>
                                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb : 2 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 13, fontWeight: 600 }}>Email Content</Typography>
                                                {isEmailSavedAsHtml ? (
                                                    <Stack direction="row" spacing={1}>
                                                        <Button
                                                            size="small"
                                                            variant={!isCodeView ? 'contained' : 'outlined'}
                                                            onClick={() => setIsCodeView(false)}
                                                            startIcon={<IoMdDocument size={16} />}
                                                            sx={{
                                                                textTransform: 'none',
                                                                fontWeight: 600,
                                                                ...(!isCodeView
                                                                    ? {
                                                                          bgcolor: '#059669',
                                                                          color: 'common.white',
                                                                          '&:hover': {
                                                                              bgcolor: '#047857',
                                                                          },
                                                                      }
                                                                    : { bgcolor: 'transparent', color: '#059669', borderColor: '#059669',
                                                                          '&:hover': {
                                                                              borderColor: '#047857',
                                                                              bgcolor: 'rgba(8, 163, 205, 0.08)',
                                                                          },
                                                                      }),
                                                            }}
                                                        >
                                                            HTML
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant={isCodeView ? 'contained' : 'outlined'}
                                                            onClick={() => setIsCodeView(true)}
                                                            startIcon={<IoMdCode size={16} />}
                                                            sx={{
                                                                textTransform: 'none',
                                                                fontWeight: 600,
                                                                ...(isCodeView
                                                                    ? {
                                                                          bgcolor: '#059669',
                                                                          color: 'common.white',
                                                                          '&:hover': {
                                                                              bgcolor: '#047857',
                                                                          },
                                                                      }
                                                                    : { bgcolor: 'transparent', color: '#059669', borderColor: '#059669',
                                                                          '&:hover': {
                                                                              borderColor: '#047857',
                                                                              bgcolor: 'rgba(8, 163, 205, 0.08)',
                                                                          },
                                                                      }),
                                                            }}
                                                        >
                                                            Code
                                                        </Button>
                                                    </Stack>
                                                ) : (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        sx={{
                                                            textTransform: 'none',
                                                            fontWeight: 600,
                                                            bgcolor: '#059669',
                                                            color: 'common.white',
                                                            pointerEvents: 'none',
                                                            '&:hover': {
                                                                bgcolor: '#059669',
                                                            },
                                                        }}
                                                        startIcon={<IoMdDocument size={16} />}
                                                    >
                                                        Plain Text
                                                    </Button>
                                                )}
                                            </Stack>

                                            <Box
                                                sx={{
                                                    p: 2,
                                                    bgcolor: 'background.paper',
                                                    borderRadius: 1,
                                                    border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                                                    minHeight: 150,
                                                }}
                                            >
                                                {isEmailSavedAsHtml && isCodeView ? (
                                                    <Box component="pre" sx={{ m: 0, fontFamily: 'Monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                        <Box component="code">{decodedEmailContent || 'No content'}</Box>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ height: '100%' }} dangerouslySetInnerHTML={{ __html: decodedEmailContent || '<p style="color: gray; margin: 0;">No content</p>' }} />
                                                )}
                                            </Box>
                                        </Stack>
                                    </Stack>
                                    <Stack spacing={1}>
                                        <Stack>
                                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb : 2 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 13, fontWeight: 600 }}>Footer Content</Typography>
                                                {isFooterSavedAsHtml ? (
                                                    <Stack direction="row" spacing={1}>
                                                        <Button
                                                            size="small"
                                                            variant={!isCodeViewFooter ? 'contained' : 'outlined'}
                                                            onClick={() => setIsCodeViewFooter(false)}
                                                            startIcon={<IoMdDocument size={16} />}
                                                            sx={{
                                                                textTransform: 'none',
                                                                fontWeight: 600,
                                                                ...(!isCodeViewFooter
                                                                    ? {
                                                                          bgcolor: '#059669',
                                                                          color: 'common.white',
                                                                          '&:hover': {
                                                                              bgcolor: '#047857',
                                                                          },
                                                                      }
                                                                    : {
                                                                          bgcolor: 'transparent',
                                                                          color: '#059669',
                                                                          borderColor: '#059669',
                                                                          '&:hover': {
                                                                              borderColor: '#047857',
                                                                              bgcolor: 'rgba(8, 163, 205, 0.08)',
                                                                          },
                                                                      }),
                                                            }}
                                                        >
                                                            HTML
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant={isCodeViewFooter ? 'contained' : 'outlined'}
                                                            onClick={() => setIsCodeViewFooter(true)}
                                                            startIcon={<IoMdCode size={16} />}
                                                            sx={{
                                                                textTransform: 'none',
                                                                fontWeight: 600,
                                                                ...(isCodeViewFooter
                                                                    ? {
                                                                          bgcolor: '#059669',
                                                                          color: 'common.white',
                                                                          '&:hover': {
                                                                              bgcolor: '#047857',
                                                                          },
                                                                      }
                                                                    : {
                                                                          bgcolor: 'transparent',
                                                                          color: '#059669',
                                                                          borderColor: '#059669',
                                                                          '&:hover': {
                                                                              borderColor: '#047857',
                                                                              bgcolor: 'rgba(8, 163, 205, 0.08)',
                                                                          },
                                                                      }),
                                                            }}
                                                        >
                                                            Code
                                                        </Button>
                                                    </Stack>
                                                ) : (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        sx={{
                                                            textTransform: 'none',
                                                            fontWeight: 600,
                                                            bgcolor: '#059669',
                                                            color: 'common.white',
                                                            pointerEvents: 'none',
                                                            '&:hover': {
                                                                bgcolor: '#059669',
                                                            },
                                                        }}
                                                        startIcon={<IoMdDocument size={16} />}
                                                    >
                                                        Plain Text
                                                    </Button>
                                                )}
                                            </Stack>
                                            <Box 
                                                sx={{ 
                                                    p: 2, 
                                                    bgcolor: 'background.paper', 
                                                    borderRadius: 1,
                                                    border: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                                                    minHeight: 150
                                                }}
                                            >
                                                {isFooterSavedAsHtml && isCodeViewFooter ? (
                                                    <Box component="pre" sx={{ m: 0, fontFamily: 'Monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                        <Box component="code">{decodedFooterContent || 'No content'}</Box>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ height: '100%' }} dangerouslySetInnerHTML={{ __html: decodedFooterContent || '<p style="color: gray; margin: 0;">No footer content</p>' }} />
                                                )}
                                            </Box>
                                        </Stack>
                                    </Stack>
                                </Stack>
                            </Box>
                        </Stack>
                        {/* Attachments */}
                        <Stack spacing={1.5} sx={{ mt: 3 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                                <IoMdLink size={20} />
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Attachments</Typography>
                            </Stack>
                            <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (themeVar) => alpha(themeVar.palette.primary.main, 0.03),border: (themeVar) => `1px solid ${alpha(themeVar.palette.primary.main, 0.16)}`, minHeight: 125 }}>
                                {parsedAttachments.length === 0 ? (
                                    <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', color: 'text.secondary', mt: 2 }}>
                                        <Iconify icon={"solar:file-bold" as any} width={32} height={32} sx={{ mb: 1, opacity: 0.48 }} />
                                        <Typography variant="body2">No attachments found</Typography>
                                    </Stack>
                                ) : (
                                    <Stack spacing={1}>
                                        {parsedAttachments.map((file: any, index: number) => {
                                            const url = typeof file === 'string' ? file : (file.file || file.url || '');
                                            const fileName = url ? decodeURIComponent(url.split('/').pop() || 'Attachment') : 'Attachment';

                                            return (
                                                <Stack
                                                    key={index}
                                                    direction="row"
                                                    alignItems="center"
                                                    sx={{
                                                        px: 1.5,
                                                        py: 0.75,
                                                        borderRadius: 1.5,
                                                        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                                    }}
                                                >
                                                    <Iconify icon={"solar:link-bold" as any} width={20} sx={{ mr: 1, color: 'text.secondary', flexShrink: 0 }} />
                                                    <Typography variant="body2" noWrap sx={{ flexGrow: 1, fontWeight: 'fontWeightMedium' }}>
                                                        {fileName}
                                                    </Typography>
                                                    
                                                    {url && (
                                                        <Stack direction="row" spacing={1}>
                                                            <Button
                                                                size="small"
                                                                variant="text"
                                                                onClick={() => window.open(url, '_blank')}
                                                                sx={{ textTransform: 'none', fontWeight: 600, color: 'info.main', py: 0 }}
                                                            >
                                                                View File
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                variant="text"
                                                                onClick={() => {
                                                                    const link = document.createElement('a');
                                                                    link.href = url;
                                                                    link.download = fileName;
                                                                    document.body.appendChild(link);
                                                                    link.click();
                                                                    document.body.removeChild(link);
                                                                }}
                                                                sx={{ textTransform: 'none', fontWeight: 600, color: 'primary.main', py: 0 }}
                                                            >
                                                                Download
                                                            </Button>
                                                        </Stack>
                                                    )}
                                                </Stack>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </Box>
                        </Stack>
                    </Box>
                </Box>
            </Card>
        </DashboardContent>
    );
}