
/*
 hiwonderiotsensor package
*/
//% weight=10 icon="\uf1eb" color=#2896ff
namespace hiwonderiotsensor {
    export enum ADPort {
        //% block="Port 1"
        port1 = 0x01         
    }
    
    export enum TempSensor { 
        //% block="Port 4"
        port4 = 0x04,       
        //% block="Port 9"
        port9 = 0x09              
    }
    
    export enum Temp_humi {
        //% block="Temperature"
        Temperature = 0x01,
        //% block="Humidity"
        Humidity = 0x02
    }

    export enum WaterPumPort {
        //% block="M1"
        port1 = 0x01,       
        //% block="M2"
        port2 = 0x02  
   }  

    /**
    *	Set the water pump on/off
    */
    //% weight=50 blockId=qdeeiot_setWaterPump block="Set water pump port|%port|speed(0~100) %speed"
    //% speed.min=0 speed.max=100
    export function qdeeiot_setWaterPump(port:WaterPumPort, speed: number) {
        if (speed > 100) {
            speed = 100;
        }
        let buf = pins.createBuffer(6);
        buf[0] = 0x55;
        buf[1] = 0x55;
        buf[2] = 0x04;
        buf[3] = 0x32;//cmd type
        if (port == WaterPumPort.port1)
        {
            buf[4] = 0;
            buf[5] = speed;
        }
        else if (port == WaterPumPort.port2)
        {
            buf[4] = speed;
            buf[5] = 0;    
        }
        serial.writeBuffer(buf);
    }
    /**
     * Get light level
     */
    //% weight=48 blockId=qdeeiot_getLightLevel block="Get light port|%port|level(0~255)"    
    export function qdeeiot_getLightLevel(port: ADPort): number
    {
        let value = 0;
        value = pins.analogReadPin(AnalogPin.P1);
        value = mapRGB(value, 0, 1023, 0, 255);
        return Math.round(255-value);
    }
    /**
     * Get soil humidity
     */
    //% weight=46 blockId="qdeeiot_getsoilhumi" block="Qdee get soil humidity port %port"   
    export function qdeeiot_getsoilhumi(port: ADPort): number {
        let value: number = 0;
        value = pins.analogReadPin(AnalogPin.P16);
        value = mapRGB(value, 0, 1023, 0, 100);
        return Math.round(value);
    }
    /**
     * Get soil humidity
     */
    //% weight=44 blockId="qdeeiot_raindrop" block="Qdee get rain drop port|%port|sensor ad value(0~255)"  
    export function qdeeiot_raindrop(port: ADPort): number {
        let value = pins.analogReadPin(AnalogPin.P16);
        value = mapRGB(value, 0, 1023, 0, 255);
        return Math.round(value);
    }

/**
* Get the obstacle avoidance sensor status,1 detect obstacle,0 no detect obstacle
*/   
   //% weight=42 blockGap=50 blockId=qdee_avoidSensor block="Obstacle avoidance sensor port|%port|detect obstacle ?" 
    export function qdee_avoidSensor(port: ADPort): number {
        let status = 0;
        let flag: number = 0;

        pins.setPull(DigitalPin.P1, PinPullMode.PullUp);
        status = pins.digitalReadPin(DigitalPin.P1);
        if (status == 1)
            flag = 0;
        else
            flag = 1;
        return flag;
    }
    
    let ATH10_I2C_ADDR = 0x38;
    function temp_i2cwrite(value: number): number {
        let buf = pins.createBuffer(3);
        buf[0] = value >> 8;
        buf[1] = value & 0xff;
        buf[2] = 0;
        basic.pause(80);
        let rvalue = pins.i2cWriteBuffer(ATH10_I2C_ADDR, buf);
        // serial.writeString("writeback:");
        // serial.writeNumber(rvalue);
        // serial.writeLine("");
        return rvalue;
    }

    function temp_i2cread(bytes: number): Buffer {
        let val = pins.i2cReadBuffer(ATH10_I2C_ADDR, bytes);
        return val;
    }

    function qdee_initTempHumiSensor(): boolean {
        for (let i = 0; i < 10; i++) {
            if (qdee_GetInitStatus()) {
                return true;
            }
            basic.pause(500);
        }
       // serial.writeString("init erro");
        return false;
    }

    function qdee_GetInitStatus(): boolean {
        temp_i2cwrite(0xe108);
        let value = temp_i2cread(1);
        if ((value[0] & 0x68) == 0x08)
            return true;
        else
            return false;
    }

    function qdee_getAc() {
        temp_i2cwrite(0xac33);
        basic.pause(100)
        let value = temp_i2cread(1);
        for (let i = 0; i < 100; i++) {
            if ((value[0] & 0x80) != 0x80) {
                basic.pause(20)
            }
            else
                break;
        }
    }

    function readTempHumi(select: Temp_humi): number {
        while (!qdee_GetInitStatus()) {
            basic.pause(30);
        }
        qdee_getAc();
        let buf = temp_i2cread(6);
        if (buf.length != 6) {
            // serial.writeLine("444444")
            return 0;
        }
        let humiValue: number = 0;
        humiValue = (humiValue | buf[1]) << 8;
        humiValue = (humiValue | buf[2]) << 8;
        humiValue = humiValue | buf[3];
        humiValue = humiValue >> 4;
        let tempValue: number = 0;
        tempValue = (tempValue | buf[3]) << 8;
        tempValue = (tempValue | buf[4]) << 8;
        tempValue = tempValue | buf[5];
        tempValue = tempValue & 0xfffff;
        if (select == Temp_humi.Temperature) {
            tempValue = tempValue * 200 * 10 / 1024 / 1024 - 500;
            return Math.round(tempValue);
        }
        else {
            humiValue = humiValue * 1000 / 1024 / 1024;
            return Math.round(humiValue);
        }
    }

    /**
     * Qdee temperature and humidity sensor initialization, please execute at boot time
    */
    //% weight=40 blockId=qdeewifi_temphumi_init block="Initialize Qdee temperature and humidity sensor at port %port"
    export function qdeewifi_temphumi_init(port: TempSensor) {
        qdee_initTempHumiSensor();
    }

    /**
      * Get sensor temperature and humidity
      */
    //% weight=38 blockId="qdeeiot_gettemperature" block="Qdee get %select" 
    export function qdeeiot_gettemperature(select: Temp_humi): number {
        return readTempHumi(select);
    }

    function mapRGB(x: number, in_min: number, in_max: number, out_min: number, out_max: number): number {
        return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    }
}
