import type { Socket } from 'socket.io-client';

import { useRef, useState, useEffect, useCallback } from 'react';

import { useHRMSSettings } from 'src/hooks/use-hrms-settings';

import { chatApi } from 'src/api/chat';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

const CALL_STORAGE_KEY = 'webrtc_active_call_session';

type CallState = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

interface SignalData {
    type: 'offer' | 'answer' | 'ice-candidate' | 'reject' | 'hangup' | 'group_call_offer';
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidate;
    from: string;
    to: string;
    room: string;
    callType: 'audio' | 'video';
}

const RINGTONE_URL = `${import.meta.env.BASE_URL}assets/ringtone/ringtone.wav`;

export function useWebRTC(
    user: { email: string, displayName?: string, full_name?: string } | null,
    socket: Socket | null,
    channelRoom?: string
) {
    const { settings } = useHRMSSettings();
    const userEmail = user?.email;
    const userName = user?.full_name || user?.displayName || userEmail;
    const getInitialSession = () => {
        if (typeof window === 'undefined') return null;
        const saved = sessionStorage.getItem(CALL_STORAGE_KEY);
        if (!saved) {
            // console.log('RTC: No saved session found.');
            return null;
        }
        try {
            const data = JSON.parse(saved);
            // console.log('RTC: Found saved session, checking validity...', data);
            if (Date.now() - data.timestamp < 3600000 && data.room) {
                // console.log('RTC: Session is valid and recent.');
                return data;
            }
            // console.log('RTC: Session expired or invalid.', { diff: Date.now() - data.timestamp, room: data.room });
        } catch (e) {
            console.error('RTC: Failed to parse saved session', e);
        }
        return null;
    };

    const initialSession = getInitialSession();

    const [callState, setCallState] = useState<CallState>(initialSession?.callState || 'idle');
    const [remoteUser, setRemoteUser] = useState<string | null>(initialSession?.remoteUser || null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [callType, setCallType] = useState<'audio' | 'video'>(initialSession?.callType || 'audio');
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoDisabled, setIsVideoDisabled] = useState(false);
    const [isGroupCall, setIsGroupCall] = useState(initialSession?.isGroupCall || false);
    const [liveKitToken, setLiveKitToken] = useState<string | null>(initialSession?.liveKitToken || null);
    const [liveKitUrl, setLiveKitUrl] = useState<string | null>(initialSession?.liveKitUrl || null);
    const [callError, setCallError] = useState<string | null>(null);
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const pendingCandidates = useRef<RTCIceCandidate[]>([]);
    const currentRoom = useRef<string | null>(initialSession?.room || null);
    const currentChannelRoom = useRef<string | null>(initialSession?.channelRoom || null);
    const callStartTimeRef = useRef<number | null>(initialSession?.timestamp || null);
    const hasConnectedRef = useRef<boolean>(!!initialSession);
    const participantsCountRef = useRef<number>(0);

    const cleanup = useCallback(async (participantCount?: number, explicit: boolean = false) => {
        const count = participantCount ?? participantsCountRef.current;
        console.log('RTC: Cleaning up session...', { explicit, isGroupCall, count, room: currentRoom.current });

        if (currentRoom.current && userEmail) {
            try {
                const duration = callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;
                const shouldLog = !isGroupCall || (count === 1);

                console.log('RTC: Checking if should send call-end message...', { explicit, hasConnected: hasConnectedRef.current, duration, shouldLog });
                if (explicit && hasConnectedRef.current && duration > 0 && shouldLog) {
                    const typeText = isGroupCall
                        ? (callType === 'video' ? 'group_video' : 'group_audio')
                        : (callType === 'video' ? 'video' : 'audio');
                    const targetRoom = currentChannelRoom.current || currentRoom.current;
                    const localId = Date.now().toString();
                    if (targetRoom) {
                        console.log('RTC: Sending call-end message to room:', targetRoom);
                        await chatApi.sendMessage({
                            room: targetRoom,
                            content: isGroupCall 
                                ? `Meeting ended · ${duration}s [CALL_ENDED: ${typeText}|${duration}]` 
                                : `Call ended · ${duration}s [CALL_ENDED: ${typeText}|${duration}]`,
                            email: userEmail,
                            user: userName,
                            // Standard message type for better broadcast reliability
                            id_message_local_from_app: localId
                        } as any);
                        // console.log('RTC: Call-end message sent successfully');
                    }
                }
            } catch (error) {
                console.error('Failed to send call log message:', error);
            }
        }

        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        setRemoteStream(null);
        setCallState('idle');
        setRemoteUser(null);
        pendingCandidates.current = [];
        currentRoom.current = null;
        setIsAudioMuted(false);
        setIsVideoDisabled(false);
        setIsGroupCall(false);
        setLiveKitToken(null);
        setLiveKitUrl(null);
        callStartTimeRef.current = null;
        hasConnectedRef.current = false;
        participantsCountRef.current = 0;
        currentChannelRoom.current = null;
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }

        // Only clear storage if explicitly hanging up or session definitively over
        if (explicit) {
            // console.log('RTC: Explicitly clearing storage session.');
            sessionStorage.removeItem(CALL_STORAGE_KEY);
        }
    }, [localStream, callType, isGroupCall, userEmail, userName]);

    const sendSignal = useCallback(async (data: Partial<SignalData>) => {
        try {
            await chatApi.sendCallSignal(data.to!, {
                ...data,
                from: userEmail,
            });
        } catch (error) {
            console.error('Error sending call signal:', error);
        }
    }, [userEmail]);

    const createPeerConnection = useCallback((targetUser: string, room: string, type: 'audio' | 'video') => {
        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    to: targetUser,
                    room,
                });
            }
        };

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        pc.onconnectionstatechange = () => {
            console.log('WebRTC Connection State:', pc.connectionState);
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                if (pc.connectionState === 'failed') {
                    setCallError('Call connection lost. Please try again.');
                }
                cleanup();
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('WebRTC ICE Connection State:', pc.iceConnectionState);
        };

        pcRef.current = pc;
        return pc;
    }, [sendSignal, cleanup]);

    const startCall = useCallback(async (targetUser: string, room: string, type: 'audio' | 'video' = 'audio') => {
        try {
            setCallType(type);
            setRemoteUser(targetUser);
            setCallState('calling');
            currentRoom.current = room;
            currentChannelRoom.current = room;
            callStartTimeRef.current = Date.now();
            hasConnectedRef.current = true;

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Media devices are not available in this context (possibly insecure context).');
            }

            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            const constraints: MediaStreamConstraints = {
                audio: true,
                video: type === 'video' ? {
                    width: { ideal: isMobile ? 720 : 1280 },
                    height: { ideal: isMobile ? 1280 : 720 },
                    facingMode: 'user',
                    aspectRatio: isMobile ? 9 / 16 : 16 / 9,
                } : false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setLocalStream(stream);

            const pc = createPeerConnection(targetUser, room, type);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            sendSignal({
                type: 'offer',
                sdp: offer,
                to: targetUser,
                room,
                callType: type,
            });
        } catch (error: any) {
            console.error('Error starting call:', error);

            let errorMessage = 'Failed to start call.';
            if (error.name === 'NotFoundError') {
                errorMessage = 'No microphone or camera found. Please check your hardware.';
            } else if (error.name === 'NotAllowedError') {
                errorMessage = 'Microphone/Camera access denied. Please enable permissions.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Microphone or camera is already in use by another application.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            // console.error('Group call start error:', error);
            setCallError(errorMessage);
            cleanup();
        }
    }, [createPeerConnection, sendSignal, cleanup]);

    const startGroupCall = useCallback(async (chatRoomId: string, type: 'audio' | 'video', signalingRoomId?: string) => {
        const roomName = signalingRoomId || chatRoomId;
        try {
            setCallType(type);
            setIsGroupCall(true);
            setCallState('connected');
            const response = await chatApi.getLiveKitToken(roomName);
            const data = response.message || response;

            callStartTimeRef.current = Date.now();
            hasConnectedRef.current = true;
            currentRoom.current = roomName;
            currentChannelRoom.current = chatRoomId;

            setLiveKitToken(data.token);
            setLiveKitUrl(data.server_url);

            // Notify other members
            const membersResponse = await chatApi.getChatMembers(chatRoomId);
            const results = membersResponse.message?.results || [];
            const members = results[0]?.chat_members || [];

            if (members && Array.isArray(members)) {
                members.forEach((member: any) => {
                    const memberEmail = member.user || member.email || member.user_email;
                    if (memberEmail && memberEmail !== userEmail) {
                        sendSignal({
                            type: 'group_call_offer',
                            to: memberEmail,
                            room: roomName,
                            callType: type,
                        });
                    }
                });
            }

            // Send invitation to the ACTUAL chat room
            try {
                const localId = Date.now().toString();
                // console.log('RTC: Sending group call invitation message to room:', chatRoomId);
                
                const msgResponse = await chatApi.sendMessage({
                    room: chatRoomId,
                    content: `Join our group ${type} call! [GROUP_CALL]`,
                    email: userEmail,
                    user: userName,
                    // Standard message type for better broadcast reliability
                    id_message_local_from_app: localId
                } as any);
                // console.log('RTC: Group call invitation response:', msgResponse);
                // console.log('RTC: Group call invitation sent successfully');
            } catch (msgError: any) {
                // console.error('RTC: Failed to send group call invitation:', msgError);
                setCallError(`Failed to post join invitation: ${msgError.message || 'Unknown error'}`);
            }
        } catch (error: any) {
            // console.error('RTC: Error starting group call:', error);
            setCallError(error.message || 'Failed to start group call.');
            cleanup();
        }
    }, [cleanup, sendSignal, userEmail, userName]);

    const acceptCall = useCallback(async () => {
        if (!remoteUser || !currentRoom.current) {
            console.error('Accept call failed: missing remoteUser or currentRoom', { remoteUser, room: currentRoom.current });
            return;
        }

        try {
            if (isGroupCall) {
                console.log('Accepting GROUP call for room:', currentRoom.current);
                setCallState('connected');

                callStartTimeRef.current = Date.now();
                hasConnectedRef.current = true;

                const response = await chatApi.getLiveKitToken(currentRoom.current);
                const data = response.message || response;
                setLiveKitToken(data.token);
                setLiveKitUrl(data.server_url);
                return;
            }

            console.log('Accepting P2P call from:', remoteUser);
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Media devices are not available in this context.');
            }

            callStartTimeRef.current = Date.now();
            hasConnectedRef.current = true;

            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            const constraints: MediaStreamConstraints = {
                audio: true,
                video: callType === 'video' ? {
                    width: { ideal: isMobile ? 720 : 1280 },
                    height: { ideal: isMobile ? 1280 : 720 },
                    facingMode: 'user',
                    aspectRatio: isMobile ? 9 / 16 : 16 / 9,
                } : false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setLocalStream(stream);

            const pc = pcRef.current;
            if (!pc) return;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            sendSignal({
                type: 'answer',
                sdp: answer,
                to: remoteUser,
                room: currentRoom.current,
            });

            setCallState('connected');

            // Process any pending candidates
            pendingCandidates.current.forEach(candidate => {
                pc.addIceCandidate(candidate).catch(e => console.error('Error adding pending candidate', e));
            });
            pendingCandidates.current = [];
        } catch (error: any) {
            console.error('Error accepting call:', error);

            let errorMessage = 'Failed to accept call.';
            if (error.name === 'NotFoundError') {
                errorMessage = 'No microphone or camera found.';
            } else if (error.name === 'NotAllowedError') {
                errorMessage = 'Microphone/Camera access denied.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            setCallError(errorMessage);

            if (remoteUser && currentRoom.current) {
                sendSignal({
                    type: 'reject',
                    to: remoteUser,
                    room: currentRoom.current,
                });
            }
            cleanup();
        }
    }, [remoteUser, callType, isGroupCall, sendSignal, cleanup]);

    const rejectCall = useCallback(() => {
        if (remoteUser && currentRoom.current) {
            sendSignal({
                type: 'reject',
                to: remoteUser,
                room: currentRoom.current,
            });
        }
        cleanup(undefined, true);
    }, [remoteUser, sendSignal, cleanup]);

    const hangUp = useCallback(async (participantCount?: number, explicit: boolean = true) => {
        if (callState === 'calling' || callState === 'incoming') {
            // ... (rest of the logic remains unchanged)
            if (isGroupCall && currentRoom.current) {
                try {
                    const membersResponse = await chatApi.getChatMembers(currentRoom.current);
                    const results = membersResponse.message?.results || [];
                    const members = results[0]?.chat_members || [];

                    if (members && Array.isArray(members)) {
                        members.forEach((member: any) => {
                            const memberEmail = member.user || member.email || member.user_email;
                            if (memberEmail && memberEmail !== userEmail) {
                                sendSignal({
                                    type: 'reject',
                                    to: memberEmail,
                                    room: currentRoom.current!,
                                    callType,
                                });
                            }
                        });
                    }
                } catch (e) {
                    console.error('Failed to notify members of group hangup:', e);
                }
            } else if (remoteUser) {
                sendSignal({
                    type: 'reject',
                    to: remoteUser,
                    room: currentRoom.current!,
                });
            }
        } else if (callState === 'connected') {
            if (isGroupCall) {
                const count = participantCount ?? participantsCountRef.current;
                if (count === 1 && currentRoom.current) {
                    try {
                        const membersResponse = await chatApi.getChatMembers(currentRoom.current);
                        const results = membersResponse.message?.results || [];
                        const members = results[0]?.chat_members || [];

                        if (members && Array.isArray(members)) {
                            members.forEach((member: any) => {
                                const memberEmail = member.user || member.email || member.user_email;
                                if (memberEmail && memberEmail !== userEmail) {
                                    sendSignal({
                                        type: 'hangup',
                                        to: memberEmail,
                                        room: currentRoom.current!,
                                        callType,
                                    });
                                }
                            });
                        }
                    } catch (e) {
                        console.error('Failed to notify members of group hangup in connected state:', e);
                    }
                }
            } else if (remoteUser) {
                sendSignal({
                    type: 'hangup',
                    to: remoteUser,
                    room: currentRoom.current!,
                });
            }
        }
        cleanup(participantCount, explicit);
    }, [cleanup, sendSignal, remoteUser, callState, isGroupCall, currentRoom, userEmail, callType]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (callState !== 'idle' && callState !== 'ended') {
                e.preventDefault();
                e.returnValue = 'You have an active call. Are you sure you want to leave?';
                return e.returnValue;
            }
            return undefined;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [callState]);

    useEffect(() => {
        if (!ringtoneRef.current) {
            ringtoneRef.current = new Audio(RINGTONE_URL);
            ringtoneRef.current.loop = true;
        }

        if (callState === 'incoming' || callState === 'calling') {
            ringtoneRef.current.play().catch(e => console.error('Error playing ringtone:', e));

            if (callState === 'incoming' && Notification.permission === 'granted') {
                const logoPath = settings?.app_logo || '/favicon.ico';
                const fullIconUrl = logoPath.startsWith('http')
                    ? logoPath
                    : `${window.location.origin}${logoPath.startsWith('/') ? '' : '/'}${logoPath}`;

                const notification = new Notification('Incoming Call', {
                    body: `Incoming ${callType} call from ${remoteUser || 'someone'}`,
                    icon: fullIconUrl
                });

                notification.onclick = () => {
                    window.focus();
                };
            }
        } else if (callState === 'connected' || callState === 'idle' || callState === 'ended') {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
    }, [callState, callType, remoteUser, settings]);

    useEffect(() => {
        if (callState === 'connected' && isGroupCall && liveKitToken && liveKitUrl && currentRoom.current) {
            const sessionData = {
                callState,
                callType,
                isGroupCall,
                liveKitToken,
                liveKitUrl,
                remoteUser,
                room: currentRoom.current,
                channelRoom: currentChannelRoom.current,
                timestamp: callStartTimeRef.current || Date.now()
            };
            // console.log('RTC: Saving session to storage...', sessionData.room);
            sessionStorage.setItem(CALL_STORAGE_KEY, JSON.stringify(sessionData));
        }
    }, [callState, isGroupCall, liveKitToken, liveKitUrl, callType, remoteUser]);

    // RESTORATION LOGIC - Sync any missing bits on mount
    useEffect(() => {
        if (initialSession) {
            // console.log('RESTORING CALL SESSION ON MOUNT:', initialSession.room);
            // Most state is already set via useState initialization
        }
    }, [initialSession]); // Run once on mount (initialSession is stable)

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        if (socket) {
            const handleSignal = async (data: SignalData) => {
                if (data.to !== userEmail) return;

                let signal = data;
                if (typeof data === 'string') {
                    try {
                        signal = JSON.parse(data);
                    } catch (e) {
                        console.error('Failed to parse signal data:', e);
                        return;
                    }
                }

                switch (signal.type) {
                    case 'offer': {
                        if (callState !== 'idle') {
                            socket.emit('call_signal', {
                                type: 'reject',
                                from: userEmail,
                                to: signal.from,
                                room: signal.room,
                                reason: 'busy',
                            });
                            return;
                        }
                        setRemoteUser(signal.from);
                        setCallType(signal.callType);
                        setCallState('incoming');
                        currentRoom.current = signal.room;

                        const pc = createPeerConnection(signal.from, signal.room, signal.callType);
                        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp!));
                        break;
                    }

                    case 'group_call_offer': {
                        if (callState !== 'idle') return;
                        setRemoteUser(signal.from);
                        setCallType(signal.callType);
                        setCallState('incoming');
                        setIsGroupCall(true);
                        currentRoom.current = signal.room;
                        currentChannelRoom.current = signal.room;
                        break;
                    }

                    case 'answer':
                        if (pcRef.current) {
                            await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp!));
                            setCallState('connected');

                            callStartTimeRef.current = Date.now();
                            hasConnectedRef.current = true;

                            pendingCandidates.current.forEach(candidate => {
                                pcRef.current?.addIceCandidate(candidate).catch(e => console.error('Error adding pending candidate', e));
                            });
                            pendingCandidates.current = [];
                        }
                        break;

                    case 'ice-candidate':
                        if (pcRef.current && pcRef.current.remoteDescription) {
                            await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate!));
                        } else {
                            pendingCandidates.current.push(new RTCIceCandidate(signal.candidate!));
                        }
                        break;

                    case 'reject':
                        cleanup(undefined, true);
                        break;

                    case 'hangup':
                        cleanup(undefined, true);
                        break;

                    default:
                        break;
                }
            };

            socket.on('call_signal', handleSignal);

            return () => {
                socket.off('call_signal', handleSignal);
            };
        }
        return undefined;
    }, [socket, userEmail, callState, createPeerConnection, cleanup]);

    return {
        callState,
        remoteUser,
        localStream,
        remoteStream,
        callType,
        startCall,
        acceptCall,
        rejectCall,
        hangUp,
        callError,
        setCallError,
        isAudioMuted,
        isVideoDisabled,
        toggleAudio: () => {
            if (localStream) {
                const audioTrack = localStream.getAudioTracks()[0];
                if (audioTrack) {
                    audioTrack.enabled = !audioTrack.enabled;
                    setIsAudioMuted(!audioTrack.enabled);
                }
            }
        },
        toggleVideo: () => {
            if (localStream) {
                const videoTrack = localStream.getVideoTracks()[0];
                if (videoTrack) {
                    videoTrack.enabled = !videoTrack.enabled;
                    setIsVideoDisabled(!videoTrack.enabled);
                }
            }
        },
        setIsGroupCall,
        isGroupCall,
        liveKitToken,
        liveKitUrl,
        startGroupCall,
    };
}
