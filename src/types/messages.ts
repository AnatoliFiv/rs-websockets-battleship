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
