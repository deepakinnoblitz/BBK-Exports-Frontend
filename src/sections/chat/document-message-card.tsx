import React from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

type Props = {
    msg: any;
    isMe: boolean;
};

export default function DocumentMessageCard({ msg, isMe }: Props) {
    let url = msg.attachment;
    let filename = 'Document';

    // Try to extract from content
    const match = msg.content?.match(/<a[^>]*href="([^"]+)"[^>]*>(?:📄\s*)?(.*?)<\/a>/);
    if (match) {
        if (!url) url = match[1];
        filename = match[2];
    } else if (url) {
        filename = url.split('/').pop() || 'Document';
    } else {
        // Fallback to parse content directly if it's just a file name or something
        filename = msg.content?.replace(/<[^>]*>?/gm, '').trim() || 'Document';
    }

    const extensionMatch = filename.match(/\.([0-9a-z]+)(?:[?#]|$)/i);
    const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';

    let icon = "solar:document-bold";
    let iconColor = "#8e8e93";
    let typeLabel = "FILE";

    if (extension === 'pdf') {
        icon = "vscode-icons:file-type-pdf2";
        iconColor = "#e5252a";
        typeLabel = "PDF";
    } else if (['doc', 'docx'].includes(extension)) {
        icon = "vscode-icons:file-type-word";
        iconColor = "#185abd";
        typeLabel = "DOC";
    } else if (['xls', 'xlsx'].includes(extension)) {
        icon = "vscode-icons:file-type-excel";
        iconColor = "#107c41";
        typeLabel = "XLS";
    } else if (['ppt', 'pptx'].includes(extension)) {
        icon = "vscode-icons:file-type-powerpoint";
        iconColor = "#c84732";
        typeLabel = "PPT";
    } else if (['zip', 'rar', '7z'].includes(extension)) {
        icon = "vscode-icons:file-type-zip";
        iconColor = "#f4b400";
        typeLabel = "ZIP";
    } else if (['csv'].includes(extension)) {
        icon = "vscode-icons:file-type-excel";
        iconColor = "#107c41";
        typeLabel = "CSV";
    } else if (extension) {
        typeLabel = extension.toUpperCase();
    }

    const handleDownload = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!url) return;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isPdf = extension === 'pdf';
    const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);

    return (
        <Box
            onClick={handleDownload}
            sx={{
                width: 320,
                maxWidth: '100%',
                cursor: 'pointer',
                borderRadius: 1.5,
                overflow: 'hidden',
                bgcolor: '#005c4b',
                color: '#ffffff',
                boxShadow: (theme) => theme.customShadows.z1,
                border: '1px solid',
                borderColor: 'transparent',
                '&:hover': {
                    bgcolor: '#006c5b',
                },
                ...(isMe && { borderTopRightRadius: 0 }),
                ...(!isMe && { borderTopLeftRadius: 0 }),
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Top Preview Section */}
            {(isPdf || isImageFile) && url && (
                <Box
                    sx={{
                        width: '100%',
                        height: 180,
                        bgcolor: '#005142',
                        borderBottom: '1px solid',
                        borderColor: 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    {isPdf ? (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: 'calc(100% + 24px)',
                                height: 'calc(100% + 24px)',
                                pointerEvents: 'none',
                            }}
                        >
                            <iframe
                                title={filename}
                                src={`${url}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    pointerEvents: 'none',
                                    overflow: 'hidden'
                                }}
                                scrolling="no"
                            />
                        </Box>
                    ) : (
                        <Box
                            component="img"
                            src={url}
                            alt={filename}
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    )}
                </Box>
            )}

            {/* Bottom Info Section */}
            <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 1.5 }}>
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 1,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        flexShrink: 0
                    }}
                >
                    <Iconify icon={icon as any} width={28} sx={{ color: '#fff' }} />
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography 
                        variant="subtitle2" 
                        noWrap 
                        sx={{ 
                            fontWeight: 600, 
                            color: '#fff',
                            fontSize: '0.875rem'
                        }}
                    >
                        {filename}
                    </Typography>
                    <Stack 
                        direction="row" 
                        alignItems="center" 
                        spacing={0.5} 
                        sx={{ 
                            color: 'rgba(255,255,255,0.7)', 
                            mt: 0.25 
                        }}
                    >
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            {typeLabel}
                        </Typography>
                        {msg.file_size && (
                            <>
                                <Typography variant="caption">•</Typography>
                                <Typography variant="caption">{msg.file_size}</Typography>
                            </>
                        )}
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
}
