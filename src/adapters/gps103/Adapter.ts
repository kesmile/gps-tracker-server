import { Iadapter } from '../../server/Iadapter';
import { messageData, alarm, ping } from '../../server/interfaces/types';
import { minuteToDecimal } from '../../server/functions';

export class Gps103Adapter implements Iadapter {
    connections: string[] = ['TCP', 'UDP'];
    connection_name: string = 'GPS103';
    port: number = 5000;
    debug: boolean = false;

    public parseData(data: string): messageData {
        data = data.toString();
        let decode = data.split(',');

        if (decode.length < 5) {
            throw new Error('fail');
        }

        let pdata: messageData = {
            start: decode[6], // status
            device_id: decode[0].substring(5),// mandatory
            cmd: decode[1], // mandatory
            data: [
                decode[2], // local time
                decode[5], // time utc
                decode[7], // latitude
                decode[8],
                decode[9], // longitude
                decode[10],
                decode[11] // speed
            ],
            action: '',
            finish: 'END'
        };
        switch (pdata.cmd) {
            case "tracker":
                pdata.action = "ping";
                break;
            case "sensor alarm":
            case "move":
            case "acc alarm":
            case "help me":
            case "acc on":
            case "acc off":
                pdata.action = "alarm";
                break;
            default:
                pdata.action = "other";
        }

        return pdata;
    }
    public getAlarm(cmd: string): alarm | null {
        switch (cmd) {
            case 'sensor alarm':
                return { code: 'MOTION_SENSOR', msg: 'Shock alarm', type: 'ALARM' };
            case 'help me':
                return { code: 'SOS', msg: 'SOS alarm', type: 'ALARM' };
            case 'low battery':
                return { code: 'LOW_BATTERY', msg: 'low battery alarm', type: 'ALARM' };
            case 'move':
                return { code: 'MOVE', msg: 'move alarm', type: 'MOVE' };
            case 'speed':
                return { code: 'SPEED', msg: 'Over seed alarm', type: 'SPEED' };
            case 'acc alarm':
                return { code: 'ACC_ALARM', msg: 'Acc alarm', type: 'ALARM' };
            case 'acc on':
                return { code: 'ACC_ON', msg: 'Acc on alarm', type: 'ALARM' };
            case 'acc off':
                return { code: 'ACC_OFF', msg: 'Acc off alarm', type: 'ALARM' };
            case 'off_line':
                return { code: 'OFF_LINE', msg: 'Device is offline', type: 'ALARM' };
            case 'on_line':
                return { code: 'ON_LINE', msg: 'Device is online', type: 'ALARM' };
            default:
                return null;
        }
    }
    public getPingData(msg: messageData):ping {
        let str = msg.data;
        return {
            latitude: minuteToDecimal(str[2], str[3]),
            longitude: minuteToDecimal(str[4], str[5]),
            speed: parseInt(str[6]),
            orientation: 0,
            mileage: 0,
            accuracy: null,
            imei: null,
            inserted: new Date(),
            cmd: null
        }
    }

}