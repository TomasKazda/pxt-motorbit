type Buttons = {
    a: boolean,
    b: boolean,
    c: boolean,
    d: boolean,
    e: boolean,
    f: boolean,
    p: boolean
}
type LineSensors = {
    r: boolean,
    c: boolean,
    l: boolean
}
enum Pins {
    wr = DigitalPin.P8,
    wl = DigitalPin.P13,
    r = DigitalPin.P12,
    l = DigitalPin.P14,
    c = DigitalPin.P15,
    trig = DigitalPin.P2,
    echo = DigitalPin.P1,
    ltop = DigitalPin.P16,
    lbottom = DigitalPin.P0
}
enum ServoDirection {
    Left = 2,
    Center = 1,
    Right = 0
}

const lineSensors: LineSensors = { r: false, c: false, l: false }
let data: Buttons = { a: false, b: false, c: false, d: false, e: false, f: false, p: false }
let ultrasonicData: Array<number> = []
const allIRPins: Array<number> = [Pins.wr, Pins.wl, Pins.r, Pins.l, Pins.c, Pins.trig, Pins.echo, Pins.ltop, Pins.lbottom]
for (let pin of allIRPins) {
    pins.setPull(pin, PinPullMode.PullNone);
}

const stripTop = neopixel.create(Pins.ltop as number, 4, NeoPixelMode.RGB)
const stripBottom = neopixel.create(Pins.lbottom as number, 38, NeoPixelMode.RGB)
const stripBottomDown = stripBottom.range(0, 28)
const stripBottomFrontRight = stripBottom.range(28, 4)
const stripBottomFrontCenter = stripBottom.range(31, 4)
const stripBottomFrontLeft = stripBottom.range(34, 4)

const SHIFT: number = 100
const PERIOD: number = 200
let powerReduction: number = 3

let isUp: boolean = false
let isObstacleDetected: boolean = false
let isBeeping: boolean = false
let isDriving: boolean = false

music.setVolume(220)
stripBottomDown.setBrightness(10)
stripBottomDown.showRainbow(1, 360)
doPairing();

// can be used to stop motors: carMotor()
const carMotor = (leftwheel: number = 0, rightwheel: number = 0): void => {
    if (leftwheel === 0 && rightwheel === 0) { PCAmotor.MotorStopAll(); return; }

    PCAmotor.MotorRun(PCAmotor.Motors.M1, Math.map(rightwheel, -100, 100, -190, 190))
    PCAmotor.MotorRun(PCAmotor.Motors.M4, Math.map(leftwheel, -100, 100, -255, 255))
}

const servoMove = (direction: ServoDirection): void => {
    PCAmotor.GeekServo(PCAmotor.Servos.S1, 500 + 1000 * direction)
    basic.pause(600)
    PCAmotor.StopServo(PCAmotor.Servos.S1)
}

const controlBottomLEDs = (centralIR: boolean = false): void => {
    if (centralIR && !isUp) {
        stripBottomDown.clear()
        isUp = true
    } else if (!centralIR && isUp) {
        stripBottomDown.showRainbow(1, 360)
        isUp = false
    }
    stripBottomDown.rotate()
    stripBottomDown.show()
}

const obstacleDetector = (distance: number = 0): void => {
    ultrasonicData.unshift(distance)
    console.log(distance)
    if (ultrasonicData.length > 5) {
        ultrasonicData.pop()
        const average: number = ultrasonicData.reduce((sum, currentValue) => sum + currentValue, 0) / ultrasonicData.length

        if (average > 1 && average < 6 && !isObstacleDetected) {
            music._playDefaultBackground(music.builtInPlayableMelody(Melodies.Wawawawaa), music.PlaybackMode.LoopingInBackground)
            stripTop.showColor(neopixel.hsl(0, 100, 10))
            isObstacleDetected = true
        } else if ((average >= 6 || average <= 1) && isObstacleDetected) {
            music.stopAllSounds()
            stripTop.clear()
            isObstacleDetected = false
        }
        stripTop.show()

    }
}

const reset = (): void => {
    carMotor()
    music.stopAllSounds()
    stripTop.clear()
    stripTop.show()
    stripBottomDown.clear()
    stripBottomDown.show()
    stripBottomFrontLeft.clear()
    stripBottomFrontLeft.show()
    stripBottomFrontCenter.clear()
    stripBottomFrontCenter.show()
    stripBottomFrontRight.clear()
    stripBottomFrontRight.show()
}

basic.forever(function (): void {
    controlBottomLEDs(!!pins.digitalReadPin(Pins.c as number))
    //obstacleDetector(Sensors.ping(Pins.trig as number, Pins.echo as number, 15))
    
    if (lastCall + 3000 > control.millis()) carMotor();

    basic.pause(PERIOD)
})

const carMovement = (): void => {
    // buttons
    if (data.a && powerReduction < 6) powerReduction += 0.5
    else if (data.b && powerReduction > 1) powerReduction -= 0.5

    if (data.c && !isBeeping && !isObstacleDetected) {
        music._playDefaultBackground(music.builtInPlayableMelody(Melodies.PowerUp), music.PlaybackMode.LoopingInBackground)
        isBeeping = true
    } else if (!data.c && isBeeping && !isObstacleDetected) {
        music.stopMelody(MelodyStopOptions.All)
        isBeeping = false
    }
    // servo
    if (data.e) {
        carMotor()
        servoMove(ServoDirection.Center)
    } else if (data.f) {
        carMotor()
        servoMove(ServoDirection.Left)
    } else if (data.d) {
        carMotor()
        servoMove(ServoDirection.Right)
    }

    // leds
    stripBottomFrontRight.clear()
    stripBottomFrontCenter.clear()
    stripBottomFrontLeft.clear()
    if (joyState.dirArrow === ArrowNames.East || joyState.dirArrow === ArrowNames.NorthEast) {
        stripBottomFrontRight.showColor(neopixel.hsl(120, 100, 10))
        stripBottomFrontRight.show()
    } else if (joyState.dirArrow === ArrowNames.West || joyState.dirArrow === ArrowNames.NorthWest) {
        stripBottomFrontLeft.showColor(neopixel.hsl(270, 100, 10))
        stripBottomFrontLeft.show()
    } else if (joyState.dirArrow === ArrowNames.North && joyState.strength > 5) {
        stripBottomFrontCenter.showColor(neopixel.hsl(230, 100, 15))
        stripBottomFrontCenter.show()
    } else if (joyState.dirArrow === ArrowNames.South) {
        stripBottomFrontCenter.showColor(neopixel.hsl(0, 100, 10))
        stripBottomFrontCenter.show()
    }

    driveFromJoy(joyState.deg, joyState.strength / powerReduction);
}

function driveFromJoy(deg: number, strength: number) {
    const rad = deg * Math.PI / 180

    const drive = Math.cos(rad)   // dopředná / zpětná
    const turn = Math.sin(rad)    // otáčení

    let left = drive + turn
    let right = drive - turn

    let maxMag = Math.max(Math.abs(left), Math.abs(right))
    if (maxMag > 1) {
        left /= maxMag
        right /= maxMag
    }

    const scale = strength / 100
    let leftOut = Math.round(left * scale * 100)
    let rightOut = Math.round(right * scale * 100)

    if (leftOut > 100) leftOut = 100
    if (leftOut < -100) leftOut = -100
    if (rightOut > 100) rightOut = 100
    if (rightOut < -100) rightOut = -100

    carMotor(leftOut, rightOut)
}