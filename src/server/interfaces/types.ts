export interface messageData {
    start: string,
    device_id: string,
    cmd: string,
    data: Array<string>,
    action: string,
    finish: string,
}

export interface alarm {
    code: string,
    msg: string,
    type: string
}

export interface ping {
    latitude: number,
    longitude: number,
    time: Date,
    speed: number,
    orientation: number,
    mileage: number,
    accurecy: number | null,
    imei: number | null,
    inserted: Date,
    from_cmd: string | null
}