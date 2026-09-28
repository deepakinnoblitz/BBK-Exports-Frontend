import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    src: string;
    isMe: boolean;
};

export default function ChatAudioPlayer({ src, isMe }: Props) {
    const theme = useTheme();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            const setAudioData = () => {
                setDuration(audio.duration);
                setCurrentTime(audio.currentTime);
            };

            const setAudioTime = () => {
                setCurrentTime(audio.currentTime);
                setProgress((audio.currentTime / audioRef.current!.duration) * 100);
            };

            const handleEnded = () => {
                setIsPlaying(false);
                setProgress(0);
                setCurrentTime(0);
            };

            // Add event listeners
            audio.addEventListener('loadeddata', setAudioData);
            audio.addEventListener('timeupdate', setAudioTime);
            audio.addEventListener('ended', handleEnded);

            return () => {
                audio.removeEventListener('loadeddata', setAudioData);
                audio.removeEventListener('timeupdate', setAudioTime);
                audio.removeEventListener('ended', handleEnded);
            };
        }
        return undefined;
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (event: Event, newValue: number | number[]) => {
        const audio = audioRef.current;
        if (!audio) return;

        const newTime = (audio.duration / 100) * (newValue as number);
        audio.currentTime = newTime;
        setProgress(newValue as number);
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                width: 260,
                p: 1.5,
                bgcolor: isMe ? alpha(theme.palette.common.white, 0.2) : alpha(theme.palette.grey[500], 0.12),
                borderRadius: 1.5,
            }}
        >
            <audio ref={audioRef} src={src} preload="metadata" />

            <IconButton
                onClick={togglePlay}
                sx={{
                    width: 32,
                    height: 32,
                    bgcolor: isMe ? 'common.white' : 'primary.main',
                    color: isMe ? 'primary.main' : 'common.white',
                    '&:hover': {
                        bgcolor: isMe ? 'common.white' : 'primary.dark',
                    },
                }}
            >
                <Iconify
                    icon={(isPlaying ? "solar:pause-bold" : "solar:play-bold") as any}
                    width={16}
                />
            </IconButton>

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Slider
                    size="small"
                    value={progress}
                    onChange={handleSeek}
                    sx={{
                        color: isMe ? 'common.white' : 'primary.main',
                        height: 4,
                        '& .MuiSlider-thumb': {
                            width: 10,
                            height: 10,
                            transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
                            '&:before': {
                                boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)',
                            },
                        },
                        '& .MuiSlider-rail': {
                            opacity: 0.28,
                        },
                    }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: isMe ? 'common.white' : 'text.secondary' }}>
                        {formatTime(currentTime)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: isMe ? 'common.white' : 'text.secondary' }}>
                        {formatTime(duration || 0)}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
