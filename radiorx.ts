radio.setFrequencyBand(66)
radio.setGroup(10)
radio.setTransmitSerialNumber(true)
let pairedSerialNo = -1
let lastCall = control.millis();

type ButtonKey = "A" | "B" | "C" | "D" | "E" | "F" | "P"

declare type ButtonStateItem = {
    key: ButtonKey
    value: boolean
}
declare type JoyStateItem = {
    dirArrow: number,
    strength: number,
    deg: number
}

const btnState: Array<ButtonStateItem> = [
    { key: "A", value: false },
    { key: "B", value: false },
    { key: "C", value: false },
    { key: "D", value: false },
    { key: "E", value: false },
    { key: "F", value: false },
    { key: "P", value: false }
]
const joyState: JoyStateItem = {
    dirArrow: 0,
    strength: 0,
    deg: 0
}

let pairingMode = false
const doPairing = () => {
    pairingMode = true
    pairedSerialNo = -1;
    const start = control.millis();
    while (pairingMode) {
        radio.sendValue("pairing", 0)
        basic.showIcon(IconNames.Pitchfork, 100)
        basic.clearScreen();
        if ((start + 10000) < control.millis())
            pairingMode = false;
        else
            basic.pause(300)
    }
}
input.onLogoEvent(TouchButtonEvent.LongPressed, ()=>control.inBackground(()=>doPairing()))
radio.onReceivedValue(function (name: string, value: number) {
    if (name === "serial" && (pairingMode || pairedSerialNo === -1)) {
        if (radio.receivedPacket(RadioPacketProperty.SerialNumber) === value) {
            pairedSerialNo = value
            radio.sendValue("pairing", 1)
            basic.showIcon(IconNames.Happy, 0)
            music.playTone(440, 300)
            pairingMode = false
        }
    }
    if (name === "serial" && pairedSerialNo === radio.receivedPacket(RadioPacketProperty.SerialNumber)) {
        radio.sendValue("pairing", 1)
        basic.showIcon(IconNames.Pitchfork, 100)
    }
})

radio.onReceivedNumber(function (n: number) {
    if (pairedSerialNo !== radio.receivedPacket(RadioPacketProperty.SerialNumber)) return;

    let buttonsMask = n & 0b1111111      // bity 0–6
    let dir = (n >> 7) & 0b111           // bity 7–9
    let strength = (n >> 10) & 0b1111111 // bity 10–16
    let deg = (n >> 17) & 0b111111111    // bity 17–25

    for (let i = 0; i < btnState.length; i++) {
        btnState[i].value = (buttonsMask & (1 << i)) != 0
    }
    joyState.dirArrow = dir
    joyState.strength = strength
    joyState.deg = deg

    lastCall = control.millis();

    refreshDisplay();
    //remap
    data.a = btnState[0].value;
    data.b = btnState[1].value;
    data.c = btnState[2].value;
    data.d = btnState[3].value;
    data.e = btnState[4].value;
    data.f = btnState[5].value;
    data.p = btnState[6].value;

    carMovement();
})

function getImage(ch: string): Image {
    let result: Image = images.createImage(`
        . . . . .
        . . . . .
        . # # # .
        . . . . .
        . . . . .
        `)

    switch (ch.charAt(0).toUpperCase()) {
        case "A":
            result = images.createImage(`
                . # # # .
                # . . . #
                # # # # #
                # . . . #
                # . . . #
                `)
            break;
        case "B":
            result = images.createImage(`
                # # # . .
                # . . # .
                # # # . .
                # . . # .
                # # # . .
                `)
            break;
        case "C":
            result = images.createImage(`
                . # # # .
                # . . . .
                # . . . .
                # . . . .
                . # # # .
                `)
            break;
        case "D":
            result = images.createImage(`
                # # # . .
                # . . # .
                # . . # .
                # . . # .
                # # # . .
                `)
            break;
        case "E":
            result = images.createImage(`
                # # # # #
                # . . . .
                # # # # .
                # . . . .
                # # # # #
                `)
            break;
        case "F":
            result = images.createImage(`
                # # # # #
                # . . . .
                # # # # .
                # . . . .
                # . . . .
                `)
            break;
        case "P":
            result = images.createImage(`
                # # # # .
                # . . . #
                # # # # .
                # . . . .
                # . . . .
                `)
            break;
    }

    const arrNo: number = ch.charCodeAt(0) - 48
    if (arrNo >= 0 && arrNo <= 7) result = images.arrowImage(arrNo);

    return result;
}

function refreshDisplay() {
    let imageToShow: Image = getImage("-");
    if (joyState.strength > 3) {
        imageToShow = getImage(joyState.dirArrow.toString())
    } else {
        joyState.dirArrow = 0
        joyState.deg = 0
    }
    for (let btn of btnState) {
        if (btn.value) {
            imageToShow = getImage(btn.key)
            break;
        }
    }
    imageToShow.showImage(0, 0);
}
