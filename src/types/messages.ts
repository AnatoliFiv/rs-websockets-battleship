export interface BaseMessage {
  type: string;
  data: string | object;
  id: number;
}

export interface RequestMessage extends BaseMessage {
  type: string;
  data: string | object;
  id: 0;
}

export interface ResponseMessage extends BaseMessage {
  type: string;
  data: string | object;
  id: 0;
}

export type ShipType = 'small' | 'medium' | 'large' | 'huge';

export interface Position {
  x: number;
  y: number;
}

export interface Ship {
  position: Position;
  direction: boolean;
  length: number;
  type: ShipType;
}

export interface RegRequestData {
  name: string;
  password: string;
}

export interface RegResponseData {
  name: string;
  index: number | string;
  error: boolean;
  errorText: string;
}

export interface Winner {
  name: string;
  wins: number;
}

export type UpdateWinnersResponseData = Winner[];

export type CreateRoomRequestData = string;

export interface AddUserToRoomRequestData {
  indexRoom: number | string;
}

export interface CreateGameResponseData {
  idGame: number | string;
  idPlayer: number | string;
}

export interface RoomUser {
  name: string;
  index: number | string;
}

export interface RoomData {
  roomId: number | string;
  roomUsers: RoomUser[];
}

export type UpdateRoomResponseData = RoomData[];

export interface AddShipsRequestData {
  gameId: number | string;
  ships: Ship[];
  indexPlayer: number | string;
}

export interface StartGameResponseData {
  ships: Ship[];
  currentPlayerIndex: number | string;
}

export interface AttackRequestData {
  gameId: number | string;
  x: number;
  y: number;
  indexPlayer: number | string;
}

export type AttackStatus = 'miss' | 'killed' | 'shot';

export interface AttackResponseData {
  position: Position;
  currentPlayer: number | string;
  status: AttackStatus;
}

export interface RandomAttackRequestData {
  gameId: number | string;
  indexPlayer: number | string;
}

export interface TurnResponseData {
  currentPlayer: number | string;
}

export interface FinishResponseData {
  winPlayer: number | string;
}

export type RequestType =
  | 'reg'
  | 'create_room'
  | 'add_user_to_room'
  | 'add_ships'
  | 'attack'
  | 'randomAttack';

export type ResponseType =
  | 'reg'
  | 'update_winners'
  | 'update_room'
  | 'create_game'
  | 'start_game'
  | 'turn'
  | 'attack'
  | 'finish';
