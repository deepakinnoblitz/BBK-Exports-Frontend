import { useRef, useState, useEffect } from 'react';
import { 
    FiBold, 
    FiList, 
    FiCode, 
    FiItalic, 
    FiUnderline, 
    FiAlignLeft, 
    FiRotateCcw, 
    FiAlignRight,
    FiAlignCenter,
    FiAlignJustify,
    FiChevronsLeft,
    FiChevronsRight
} from 'react-icons/fi';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------

type Props = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: boolean;
    helperText?: string;
    minHeight?: number;
};

export function RichTextEditor({ value, onChange, placeholder = 'Enter details...', error, helperText, minHeight = 200 }: Props) {
    const theme = useTheme();
    const editorRef = useRef<HTMLDivElement>(null);
    const [format, setFormat] = useState('p');

    const [textColorEl, setTextColorEl] = useState<null | HTMLElement>(null);
    const [bgColorEl, setBgColorEl] = useState<null | HTMLElement>(null);

    const handleTextColorClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setTextColorEl(event.currentTarget);
    };
    const handleTextColorClose = () => {
        setTextColorEl(null);
    };
    const handleTextColorSelect = (color: string) => {
        execCommand('foreColor', color);
        handleTextColorClose();
    };

    const handleBgColorClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setBgColorEl(event.currentTarget);
    };
    const handleBgColorClose = () => {
        setBgColorEl(null);
    };
    const handleBgColorSelect = (color: string) => {
        execCommand('hiliteColor', color);
        handleBgColorClose();
    };

    // Keep state in sync with external value updates (like initial load or form resets)
    useEffect(() => {
        if (editorRef.current) {
            if (editorRef.current.innerHTML !== value) {
                editorRef.current.innerHTML = value || '';
            }
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCommand = (command: string, arg: string = '') => {
        document.execCommand(command, false, arg);
        // Focus back to editor
        editorRef.current?.focus();
        handleInput();
    };

    const handleFormatChange = (e: any) => {
        const val = e.target.value;
        setFormat(val);
        execCommand('formatBlock', val);
    };


    const textColorOptions = [
        { label: 'Default', value: '#0F172A' },
        { label: 'Gray', value: '#64748B' },
        { label: 'Primary', value: '#08A3CD' },
        { label: 'Success', value: '#16A34A' },
        { label: 'Warning', value: '#D97706' },
        { label: 'Error', value: '#DC2626' },
    ];

    const highlightColorOptions = [
        { label: 'Clear', value: 'transparent' },
        { label: 'Yellow', value: '#FEF08A' },
        { label: 'Green', value: '#BBF7D0' },
        { label: 'Blue', value: '#BAE6FD' },
        { label: 'Red', value: '#FECACA' },
    ];

    return (
        <Box 
            sx={{ 
                border: `1px solid ${error ? theme.palette.error.main : '#E2E8F0'}`, 
                borderRadius: '12px', 
                overflow: 'hidden',
                bgcolor: '#FFFFFF',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                '&:focus-within': {
                    borderColor: error ? theme.palette.error.main : '#08A3CD',
                    boxShadow: `0 0 0 3px ${alpha(error ? theme.palette.error.main : '#08A3CD', 0.12)}`,
                }
            }}
        >
            {/* Toolbar */}
            <Stack 
                direction="row" 
                alignItems="center" 
                spacing={0.5} 
                flexWrap="wrap" 
                sx={{ 
                    p: 1, 
                    borderBottom: '1px solid #E2E8F0',
                    bgcolor: '#FAFAFA',
                    gap: 0.5
                }}
            >
                {/* Format block */}
                <Select
                    value={format}
                    onChange={handleFormatChange}
                    size="small"
                    sx={{ 
                        height: 32, 
                        fontSize: '0.85rem',
                        '& .MuiSelect-select': { py: 0.5, px: 1 },
                        '& fieldset': { border: 'none' },
                        bgcolor: 'background.paper',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0'
                    }}
                >
                    <MenuItem value="p">Normal</MenuItem>
                    <MenuItem value="h1">Heading 1</MenuItem>
                    <MenuItem value="h2">Heading 2</MenuItem>
                    <MenuItem value="h3">Heading 3</MenuItem>
                    <MenuItem value="blockquote">Quote</MenuItem>
                </Select>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20, alignSelf: 'center' }} />

                {/* Text Formatting */}
                <Tooltip title="Bold">
                    <IconButton size="small" onClick={() => execCommand('bold')} sx={{ width: 32, height: 32, borderRadius: '6px' }}>
                        <FiBold size={16} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Italic">
                    <IconButton size="small" onClick={() => execCommand('italic')} sx={{ width: 32, height: 32, borderRadius: '6px' }}>
                        <FiItalic size={16} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Underline">
                    <IconButton size="small" onClick={() => execCommand('underline')} sx={{ width: 32, height: 32, borderRadius: '6px' }}>
                        <FiUnderline size={16} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Strikethrough">
                    <IconButton size="small" onClick={() => execCommand('strikeThrough')} sx={{ width: 32, height: 32, borderRadius: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', textDecoration: 'line-through' }}>S</span>
                    </IconButton>
                </Tooltip>

                <Tooltip title="Clear Formatting">
                    <IconButton size="small" onClick={() => execCommand('removeFormat')} sx={{ width: 32, height: 32, borderRadius: '6px' }}>
                        <FiRotateCcw size={15} />
                    </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20, alignSelf: 'center' }} />

                {/* Text Color dropdown */}
                <Tooltip title="Text Color">
                    <IconButton 
                        size="small" 
                        onClick={handleTextColorClick}
                        sx={{ 
                            width: 32, 
                            height: 32, 
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: 'action.hover' }
                        }}
                    >
                        <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px', borderBottom: '2px solid #08A3CD', lineHeight: 1.1 }}>A</span>
                    </IconButton>
                </Tooltip>
                <Menu
                    anchorEl={textColorEl}
                    open={Boolean(textColorEl)}
                    onClose={handleTextColorClose}
                    slotProps={{ paper: { sx: { p: 0.5, minWidth: 120 } } }}
                >
                    {textColorOptions.map((c) => (
                        <MenuItem key={c.value} onClick={() => handleTextColorSelect(c.value)} sx={{ borderRadius: '6px', py: 0.5 }}>
                            <Stack direction="row" alignItems="center" spacing={1.5} width={1}>
                                <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: c.value }} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{c.label}</span>
                            </Stack>
                        </MenuItem>
                    ))}
                </Menu>

                {/* Highlight/BG Color dropdown */}
                <Tooltip title="Highlight Color">
                    <IconButton 
                        size="small" 
                        onClick={handleBgColorClick}
                        sx={{ 
                            width: 32, 
                            height: 32, 
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: 'action.hover' }
                        }}
                    >
                        <span style={{ fontWeight: 800, fontSize: '14px', backgroundColor: '#FEF08A', paddingLeft: '4px', paddingRight: '4px', borderRadius: '3px', lineHeight: 1.1 }}>A</span>
                    </IconButton>
                </Tooltip>
                <Menu
                    anchorEl={bgColorEl}
                    open={Boolean(bgColorEl)}
                    onClose={handleBgColorClose}
                    slotProps={{ paper: { sx: { p: 0.5, minWidth: 120 } } }}
                >
                    {highlightColorOptions.map((c) => (
                        <MenuItem key={c.value} onClick={() => handleBgColorSelect(c.value)} sx={{ borderRadius: '6px', py: 0.5 }}>
                            <Stack direction="row" alignItems="center" spacing={1.5} width={1}>
                                <Box sx={{ width: 14, height: 14, border: '1px solid #E2E8F0', borderRadius: '50%', bgcolor: c.value === 'transparent' ? '#FFF' : c.value }} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{c.label}</span>
                            </Stack>
                        </MenuItem>
                    ))}
                </Menu>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20, alignSelf: 'center' }} />

                {/* Code block */}
                <Tooltip title="Inline Code">
                    <IconButton size="small" onClick={() => execCommand('formatBlock', 'code')} sx={{ width: 32, height: 32, borderRadius: '6px' }}>
                        <FiCode size={16} />
                    </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20, alignSelf: 'center' }} />

                {/* Alignment */}
                <Tooltip title="Align Left">
                    <IconButton size="small" onClick={() => execCommand('justifyLeft')} sx={{ width: 32, height: 32, borderRadius: '6px' }}>
                        <FiAlignLeft size={16} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Align Center">
                    <IconButton size="small" onClick={() => execCommand('justifyCenter')} sx={{ width: 32, height: 32, borderRadius: '6px' }}>
                        <FiAlignCenter size={16} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Align Right">
                    <IconButton size="small" onClick={() => execCommand('justifyRight')} sx={{ width: 32, height: 32, borderRadius: '6px' }}>
                        <FiAlignRight size={16} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Align Justify">
                    <IconButton size="small" onClick={() => execCommand('justifyFull')} sx={{ width: 32, height: 32, borderRadius: '6px' }}>
                        <FiAlignJustify size={16} />
                    </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20, alignSelf: 'center' }} />

                {/* Lists */}
                <Tooltip title="Unordered List">
                    <IconButton size="small" onClick={() => execCommand('insertUnorderedList')} sx={{ width: 32, height: 32, borderRadius: '6px' }}>
                        <FiList size={16} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Ordered List">
                    <IconButton size="small" onClick={() => execCommand('insertOrderedList')} sx={{ width: 32, height: 32, borderRadius: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>1.</span>
                    </IconButton>
                </Tooltip>

                {/* Indent / Outdent */}
                <Tooltip title="Decrease Indent">
                    <IconButton size="small" onClick={() => execCommand('outdent')} sx={{ width: 32, height: 32, borderRadius: '6px' }}>
                        <FiChevronsLeft size={16} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Increase Indent">
                    <IconButton size="small" onClick={() => execCommand('indent')} sx={{ width: 32, height: 32, borderRadius: '6px' }}>
                        <FiChevronsRight size={16} />
                    </IconButton>
                </Tooltip>

            </Stack>

            {/* Editable Content Area */}
            <Box
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                data-placeholder={placeholder}
                sx={{
                    minHeight,
                    p: 2,
                    outline: 'none',
                    bgcolor: '#F8FAFC',
                    color: 'text.primary',
                    fontFamily: 'inherit',
                    fontSize: '15px',
                    lineHeight: 1.6,
                    overflowY: 'auto',
                    '&:empty:before': {
                        content: 'attr(data-placeholder)',
                        color: 'text.disabled',
                        cursor: 'text',
                        pointerEvents: 'none',
                        display: 'block'
                    },
                    '& p': {
                        margin: 0,
                        marginBottom: '8px'
                    },
                    '& blockquote': {
                        borderLeft: '4px solid #CBD5E1',
                        pl: 1.5,
                        py: 0.5,
                        m: 0,
                        mb: 1.5,
                        color: 'text.secondary',
                        fontStyle: 'italic',
                        bgcolor: '#F1F5F9',
                        borderRadius: '0 4px 4px 0'
                    },
                    '& code': {
                        fontFamily: 'monospace',
                        backgroundColor: '#E2E8F0',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        fontSize: '0.9em'
                    },
                    '& ul, & ol': {
                        pl: 3,
                        margin: 0,
                        marginBottom: '8px'
                    }
                }}
            />

            {helperText && (
                <Box sx={{ color: 'error.main', fontSize: '0.75rem', px: 2, py: 0.5 }}>
                    {helperText}
                </Box>
            )}
        </Box>
    );
}
