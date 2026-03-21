package com.lappycap.android.data

data class RadioStation(
    val name: String,
    val url: String
)

val radioStations = listOf(
    RadioStation("Groove Salad", "https://ice1.somafm.com/groovesalad-128-mp3"),
    RadioStation("Groove Salad Classic", "https://ice1.somafm.com/gsclassic-128-mp3"),
    RadioStation("Lush", "https://ice1.somafm.com/lush-128-mp3"),
    RadioStation("Deep Space One", "https://ice1.somafm.com/deepspaceone-128-mp3"),
    RadioStation("Drone Zone", "https://ice1.somafm.com/dronezone-128-mp3"),
    RadioStation("Space Station Soma", "https://ice1.somafm.com/spacestation-128-mp3"),
    RadioStation("Left Coast 70s", "https://ice1.somafm.com/seventies-128-mp3"),
    RadioStation("Underground 80s", "https://ice1.somafm.com/u80s-128-mp3"),
    RadioStation("The Trip", "https://ice1.somafm.com/thetrip-128-mp3"),
    RadioStation("Fluid", "https://ice1.somafm.com/fluid-128-mp3"),
    RadioStation("DEF CON Radio", "https://ice1.somafm.com/defcon-128-mp3"),
    RadioStation("Boot Liquor", "https://ice1.somafm.com/bootliquor-128-mp3"),
    RadioStation("cliqhop idm", "https://ice1.somafm.com/cliqhop-128-mp3"),
    RadioStation("Sonic Universe", "https://ice1.somafm.com/sonicuniverse-128-mp3"),
    RadioStation("Illinois Street Lounge", "https://ice1.somafm.com/illstreet-128-mp3"),
    RadioStation("Vaporwaves", "https://ice1.somafm.com/vaporwaves-128-mp3")
)
