import type { ReactNode } from 'react';

import React, { useContext, createContext } from 'react';

import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

import { useWebRTC } from 'src/hooks/use-webrtc';
import { useSocket } from 'src/hooks/use-socket';

import ChatCallDialog from 'src/sections/chat/chat-call-dialog';

import { useAuth } from 'src/auth/auth-context';


// ----------------------------------------------------------------------

type CallContextType = ReturnType<typeof useWebRTC>;

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
};

// ----------------------------------------------------------------------

type Props = {
    children: ReactNode;
};

export function CallProvider({ children }: Props) {
    const { user } = useAuth();
    const { socket } = useSocket(user?.email);

    const webrtc = useWebRTC(user as any, socket);

    return (
        <CallContext.Provider value={webrtc}>
            {children}
            <ChatCallDialog
                open={webrtc.callState !== 'idle'}
                onClose={() => { }}
                callState={webrtc.callState}
                callType={webrtc.callType}
                remoteUser={webrtc.remoteUser}
                localStream={webrtc.localStream}
                remoteStream={webrtc.remoteStream}
                onAccept={webrtc.acceptCall}
                onReject={webrtc.rejectCall}
                onHangUp={webrtc.hangUp}
                onToggleAudio={webrtc.toggleAudio}
                onToggleVideo={webrtc.toggleVideo}
                isAudioMuted={webrtc.isAudioMuted}
                isVideoDisabled={webrtc.isVideoDisabled}
                isGroupCall={webrtc.isGroupCall}
                liveKitToken={webrtc.liveKitToken}
                liveKitUrl={webrtc.liveKitUrl}
            />

            <Snackbar
                open={!!webrtc.callError}
                autoHideDuration={6000}
                onClose={() => webrtc.setCallError(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => webrtc.setCallError(null)}
                    severity="error"
                    variant="filled"
                    sx={{ width: '100%', boxShadow: (t) => t.customShadows.z24 }}
                >
                    {webrtc.callError}
                </Alert>
            </Snackbar>
        </CallContext.Provider>
    );
}
