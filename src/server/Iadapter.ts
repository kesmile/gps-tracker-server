import { messageData, alarm, ping } from './interfaces/types';

export interface Iadapter{
    connections:string[];
    connection_name:string;
    port:number;
    debug:boolean;

    parseData( data:string ):messageData | null;
    getAlarm( msg:string ):alarm | null;
    getPingData( msg:messageData ):ping;
}
