import events = require('events');

export class Device extends events.EventEmitter {

    private uid: string;
    private name: string;
    private maxTimeout: number = 120 * 1000;
    private timer: any = null;
    private isOffLine: boolean = false;
    private alarmOffLine: boolean = false;
    private readonly OFF_LINE: string = 'off_line';
    private readonly ON_LINE: string = 'on_line';

    constructor(private adapter: any) {
        super();

        this.on("data", this.listenerInitData);
        this.on("init", this.listenerConnected);
        this.on("end", this.listenerDisconnected);

    }

    private async listenerConnected() {
        this.isOffLine = true;
        this.sendStatusOffLineAlarm({ cmd: this.ON_LINE });

        if (this.alarmOffLine)
            this.startTimerStatusOnline();

        this.emit('connected');
    }

    private async listenerDisconnected() {
        this.isOffLine = false;
        this.stopTimerStatusOnline();
        this.sendStatusOffLineAlarm({ cmd: this.OFF_LINE });
        this.emit('disconnected');
    }

    private async listenerInitData(data: string) {
        let that = this;
        var msg_parts = that.adapter.parse_data(data);

        if (!msg_parts) {
            return;
        }

        if (typeof (msg_parts.cmd) == "undefined")
            throw "The adapter doesn't return the command (cmd) parameter";

        if (!this.uid) {
            this.uid = msg_parts.device_id;
            this.listenerConnected();
        }

        if (this.alarmOffLine) {

            if (!this.isOffLine)
                this.sendStatusOffLineAlarm({ cmd: this.ON_LINE });

            that.isOffLine = true;
            that.startTimerStatusOnline();
        }


        that.make_action(msg_parts.action, msg_parts);
    }

    private make_action(action: string, msg_parts: any) {
        let that = this;
        switch (action) {
            case "ping":
                that.ping(msg_parts);
                break;
            case "alarm":
                that.receiveAlarm(msg_parts);
                break;
            case "other":
                //that.adapter.run_other(msg_parts.cmd,msg_parts);
                break;
        }
    }

    private async ping(msg_parts: any) {
        try {
            let that = this;
            let gpsData = await that.adapter.get_ping_data(msg_parts);

            if (!gpsData)
                return;

            gpsData.imei = that.uid;
            gpsData.inserted = new Date();
            gpsData.from_cmd = msg_parts.cmd;

            that.emit("ping", gpsData);
        } catch (error) {
            console.error(error);
        }
    }

    private async receiveAlarm(msg_parts: any) {
        const message = this.adapter.receive_alarm(msg_parts);
        const details = await this.adapter.get_ping_data(msg_parts);
        Object.assign(details, {
            imei: this.uid,
            createAt: new Date(),
            from_cmd: msg_parts.cmd,
        });

        this.emit("alarm", message.code, message, details);
    }

    sendStatusOffLineAlarm(msg: object) {
        const message = this.adapter.receive_alarm(msg);
        const details = {
            imei: this.uid,
            createAt: new Date(),
            from_cmd: msg,
        };
        this.emit("alarm", message.code, message, details);
    }

    private startTimerStatusOnline() {
        let that = this;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            that.isOffLine = false;
            that.sendStatusOffLineAlarm({ cmd: that.OFF_LINE });
            this.emit('disconnected');
        }, that.maxTimeout);
    }

    private stopTimerStatusOnline() {
        clearTimeout(this.timer);
    }

    /*set alarmOffline(status){
      this._alarmOffLine = true;
    }
  
    set maxInterval(time){
      this._maxInterval = time;
    }
  
    get name(){
          return this._name;
      }
  
      set name(name) {
          this._name = name;
      }
  
      get UID() {
          return this._uid;
      }
  
      set UID(uid) {
          this._uid = uid;
      }
      */
}
