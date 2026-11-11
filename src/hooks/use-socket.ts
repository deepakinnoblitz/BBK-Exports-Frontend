import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useState, useCallback } from 'react';

export function useSocket(userEmail?: string) {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (userEmail) {
            // Determine the site name for Frappe's namespace / room system
            const getSiteName = () => {
                const host = window.location.hostname;
                if (host === 'localhost' || host === '127.0.0.1') {
                    // Local dev: match the site folder name in your bench
                    return 'erpapp.innoblitz.in';
                }
                return host; // In production the hostname IS the site name
            };

            const siteName = getSiteName();

            // ─── Connection strategy ───────────────────────────────────────────
            // Frappe Realtime uses per-site Socket.IO namespaces: /<sitename>
            // Events are only delivered inside that namespace.
            //
            // Production  : nginx proxies /socket.io → port 9011 (no explicit port)
            // Local dev   : connect directly to http://localhost:9011
            // ──────────────────────────────────────────────────────────────────
            const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const socketHost = isLocalDev
                ? `http://localhost:9011/${siteName}`
                : `${window.location.protocol}//${window.location.hostname}/${siteName}`;

            const socket = io(socketHost, {
                path: '/socket.io',
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                withCredentials: true,
            });

            socketRef.current = socket;

            socket.on('connect', () => {
                setIsConnected(true);
                // No manual subscription needed: Frappe auto-joins the socket
                // to the user:email room during authentication middleware.
            });

            socket.on('disconnect', () => {
                setIsConnected(false);
            });

            socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
            });

            return () => {
                socket.disconnect();
            };
        }
        return undefined;
    }, [userEmail]);

    // Subscribe to a specific Frappe doc room (e.g. for chat channels).
    // Frappe expects `doc_subscribe` with (doctype, docname).
    const subscribeToDoc = useCallback((doctype: string, docname: string) => {
        if (socketRef.current) {
            socketRef.current.emit('doc_subscribe', doctype, docname);
        }
    }, []);

    // Subscribe to all docs of a doctype.
    const subscribeToDoctype = useCallback((doctype: string) => {
        if (socketRef.current) {
            socketRef.current.emit('doctype_subscribe', doctype);
        }
    }, []);

    // Legacy alias kept for callers that pass a raw room name string.
    const subscribeToRoom = useCallback((roomName: string) => {
        if (socketRef.current) {
            // roomName from clefincode_chat is the channel doc name; emit as doc_subscribe.
            socketRef.current.emit('doc_subscribe', 'ClefinCode Chat Channel', roomName);
        }
    }, []);

    const subscribeToEvent = useCallback(
        (event: string, handler: (data: any) => void) => {
            socketRef.current?.on(event, handler);
            return () => {
                socketRef.current?.off(event, handler);
            };
        },
        []
    );

    return {
        socket: socketRef.current,
        isConnected,
        subscribeToRoom,
        subscribeToDoc,
        subscribeToDoctype,
        subscribeToEvent,
    };
}
