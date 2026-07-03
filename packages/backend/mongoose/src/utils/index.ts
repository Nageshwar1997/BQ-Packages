import { connection, STATES } from 'mongoose';

export const getConnectionState = () => connection.readyState;

export const isConnected = () => connection.readyState === STATES.connected;

export const isDisconnected = () => connection.readyState === STATES.disconnected;

export const isConnecting = () => connection.readyState === STATES.connecting;

export const isDisconnecting = () => connection.readyState === STATES.disconnecting;

export const isUninitialized = () => connection.readyState === STATES.uninitialized;
