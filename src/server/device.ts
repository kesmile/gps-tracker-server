import events = require('events');
import { Iadapter } from './Iadapter';
import { messageData, alarm, ping } from './interfaces/types';

export class Device extends events.EventEmitter {

    private uid: number;
    private _name: string;
    private maxTimeout: number = 120 * 1000;
    private timer: any = null;
    private isOffLine: boolean = false;
    private alarmOffLine: boolean = false;
    private readonly OFF_LINE: string = 'off_line';
    private readonly ON_LINE: string = 'on_line';

    constructor(private adapter: Iadapter) {
        super();

        this.on("data", this.listenerInitData);
        this.on("init", this.listenerConnected);
        this.on("end", this.listenerDisconnected);

    }

    private async listenerConnected() {
        this.isOffLine = true;
        this.sendStatusOffLineAlarm(this.ON_LINE);

        if (this.alarmOffLine)
            this.startTimerStatusOnline();

        this.emit('connected');
    }

    private async listenerDisconnected() {
        this.isOffLine = false;
        this.stopTimerStatusOnline();
        this.sendStatusOffLineAlarm(this.OFF_LINE);
        this.emit('disconnected');
    }

    private async listenerInitData(data: string) {
        let that = this;
        var msg = that.adapter.parseData(data);

        if (!msg) {
            return;
        }

        if (!msg.cmd)
            throw "The adapter doesn't return the command parameter";

        if (!this.uid) {
            this.uid = parseInt(msg.device_id);
            this.listenerConnected();
        }

        if (this.alarmOffLine) {

            if (!this.isOffLine)
                this.sendStatusOffLineAlarm(this.ON_LINE );

            that.isOffLine = true;
            that.startTimerStatusOnline();
        }
        
        that.make_action(msg.action, msg);
    }

    private make_action(action: string, msg: any) {
        let that = this;
        switch (action) {
            case "ping":
                that.ping(msg);
                break;
            case "alarm":
                that.receiveAlarm(msg.cmd,msg);
                break;
            case "other":
                //TODO
                break;
        }
    }

    private async ping(msg: messageData) {
        try {
            let that = this;
            let gpsData:ping = that.adapter.getPingData(msg);
            
            if (!gpsData)
                return;
            
            gpsData.imei = that.uid;
            gpsData.inserted = new Date();
            gpsData.cmd = msg.cmd;

            that.emit("ping", gpsData);
        } catch (error) {
            console.error(error);
        }
    }

    private async receiveAlarm(cmd: string, msg: messageData) {
        let message:alarm | null = this.adapter.getAlarm(cmd);
        const details = await this.adapter.getPingData(msg);
        Object.assign(details, {
            imei: this.uid,
            from_cmd: cmd,
        });
        
        if(!message)
            throw new Error('message is empty');

        this.emit("alarm", message.code, message, details);
    }

    sendStatusOffLineAlarm(msg: string) {
        const message = this.adapter.getAlarm(msg);
        const details = {
            imei: this.uid,
            from_cmd: msg,
        };

        if(!message)
            throw new Error('message is empty');

        this.emit("alarm", message.code, message, details);
    }

    private startTimerStatusOnline() {
        let that = this;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            that.isOffLine = false;
            that.sendStatusOffLineAlarm(that.OFF_LINE);
            this.emit('disconnected');
        }, that.maxTimeout);
    }

    private stopTimerStatusOnline() {
        clearTimeout(this.timer);
    }

    set alarmOffline(status: boolean) {
        this.alarmOffLine = true;
    }

    set maxInterval(time: number) {
        this.maxTimeout = time;
    }

    get name() {
        return this._name;
    }

    set name(name) {
        this._name = name;
    }

    get UID() {
        return this.uid;
    }

    set UID(uid) {
        this.uid = uid;
    }

}
