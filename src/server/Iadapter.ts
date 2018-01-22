import { messageData, alarm, ping } from './interfaces/types';

export interface Iadapter{
    connections:string[];
    connection_name:string;
    port:number;
    debug:boolean;

    parse_data( data:string ):messageData | null;
    receive_alarm( msg_parts:string ):alarm | null;
    get_ping_data( msg_parts:messageData ):ping;
}