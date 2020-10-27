import React, { useContext } from 'react';

const DataContext = React.createContext(null);

export const useData = () => useContext(DataContext);

export const useRoomId = () => useData().roomId;
export const useMode = () => useData().mode;
export const useLang = () => useData().lang;
export const useUrl = () => useData().url;
export const useHost = () => useData().host;
export const useGameState = () => useData().state; // conflict with useState duh
export const usePlayers = () => useData().players;
export const useCurrentRound = () => useData().currentRound;
export const useRules = () => useData().rules;
export const useLeaderboard = () => useData().leaderboard;
export const useCurrentState = () => useData().currentState;
export const useUsername = () => useData().username;

export default DataContext;
