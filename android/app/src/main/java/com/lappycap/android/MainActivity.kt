package com.lappycap.android

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.mediarouter.app.MediaRouteButton
import com.google.android.gms.cast.framework.CastButtonFactory
import com.google.android.gms.cast.framework.CastContext
import com.lappycap.android.data.radioStations
import com.lappycap.android.data.scenes

// Theme colors
private val Background = Color(0xFF0A0A0A)
private val Surface = Color(0xFF141414)
private val Accent = Color(0xFF64C8FF)
private val TextPrimary = Color(0xFFE0E0E0)
private val TextSecondary = Color(0xFF888888)
private val SurfaceBorder = Color(0xFF2A2A2A)

class MainActivity : ComponentActivity() {

    private lateinit var sender: LappyCapSender

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize CastContext early
        CastContext.getSharedInstance(this)

        sender = LappyCapSender(this)

        setContent {
            LappyCapApp(sender)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        sender.release()
    }
}

@Composable
fun LappyCapApp(sender: LappyCapSender) {
    var isConnected by remember { mutableStateOf(sender.isConnected) }
    var deviceName by remember { mutableStateOf(sender.getDeviceName()) }
    var selectedStation by remember { mutableStateOf(radioStations[0]) }
    var selectedScene by remember { mutableStateOf(scenes[0]) }
    var volume by remember { mutableFloatStateOf(0.8f) }
    var cycleDuration by remember { mutableIntStateOf(30) }
    var blendDuration by remember { mutableIntStateOf(8) }
    var isPaused by remember { mutableStateOf(false) }

    // Debounce handler for settings
    val handler = remember { Handler(Looper.getMainLooper()) }
    val settingsRunnable = remember { mutableStateOf<Runnable?>(null) }

    fun sendSettingsDebounced() {
        settingsRunnable.value?.let { handler.removeCallbacks(it) }
        val runnable = Runnable {
            sender.sendSettings(cycleDuration, blendDuration, volume)
        }
        settingsRunnable.value = runnable
        handler.postDelayed(runnable, 300L)
    }

    // Listen for connection changes
    DisposableEffect(sender) {
        sender.setOnConnectionChangedListener { connected ->
            isConnected = connected
            deviceName = if (connected) sender.getDeviceName() else null
        }
        onDispose {
            sender.setOnConnectionChangedListener {}
        }
    }

    // Periodically refresh connection state (Cast SDK doesn't always callback)
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(2000)
            val connected = sender.isConnected
            if (connected != isConnected) {
                isConnected = connected
                deviceName = if (connected) sender.getDeviceName() else null
            }
        }
    }

    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Accent,
            onPrimary = Background,
            surface = Surface,
            onSurface = TextPrimary,
            background = Background,
            onBackground = TextPrimary,
            secondary = Accent,
            outline = SurfaceBorder
        )
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(Background)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header
            item {
                Spacer(modifier = Modifier.statusBarsPadding())
                HeaderSection()
            }

            // Connection status
            item {
                StatusSection(isConnected, deviceName)
            }

            // Station picker
            item {
                SectionLabel("📻 STATIONS")
            }
            item {
                StationPicker(
                    selectedStation = selectedStation,
                    enabled = isConnected,
                    onStationSelected = { station ->
                        selectedStation = station
                        isPaused = false
                        sender.sendLoad(
                            audioUrl = station.url,
                            stationName = station.name,
                            sceneName = selectedScene.name,
                            volume = volume
                        )
                    }
                )
            }

            // Scene picker
            item {
                SectionLabel("🎨 SCENES")
            }
            item {
                ScenePicker(
                    selectedScene = selectedScene,
                    enabled = isConnected,
                    onSceneSelected = { scene ->
                        selectedScene = scene
                        sender.sendScene(scene.name)
                    }
                )
            }

            // Playback
            item {
                SectionLabel("⏯️ PLAYBACK")
            }
            item {
                PauseButton(
                    isPaused = isPaused,
                    enabled = isConnected,
                    onToggle = {
                        isPaused = !isPaused
                        if (isPaused) sender.sendPause() else sender.sendResume()
                    }
                )
            }

            // Controls
            item {
                SectionLabel("🎛️ CONTROLS")
            }
            item {
                ControlsRow(
                    enabled = isConnected,
                    onPrev = { sender.sendPrev() },
                    onShuffle = { sender.sendShuffle() },
                    onNext = { sender.sendNext() }
                )
            }

            // Volume
            item {
                SectionLabel("🔊 VOLUME")
            }
            item {
                VolumeSlider(
                    volume = volume,
                    enabled = isConnected,
                    onVolumeChange = { newVolume ->
                        volume = newVolume
                        sendSettingsDebounced()
                    }
                )
            }

            // Preset timing
            item {
                SectionLabel("⏱️ PRESET TIMING")
            }
            item {
                TimingSliders(
                    cycleDuration = cycleDuration,
                    blendDuration = blendDuration,
                    enabled = isConnected,
                    onCycleChange = { newCycle ->
                        cycleDuration = newCycle
                        sendSettingsDebounced()
                    },
                    onBlendChange = { newBlend ->
                        blendDuration = newBlend
                        sendSettingsDebounced()
                    }
                )
            }

            // Bottom padding
            item {
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}

@Composable
fun HeaderSection() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "LappyCap \uD83C\uDFAC",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = Accent
        )

        // Native MediaRouteButton via AndroidView
        AndroidView(
            factory = { context ->
                MediaRouteButton(context).apply {
                    CastButtonFactory.setUpMediaRouteButton(context, this)
                }
            },
            modifier = Modifier.size(48.dp)
        )
    }
}

@Composable
fun StatusSection(isConnected: Boolean, deviceName: String?) {
    val statusText = if (isConnected && deviceName != null) {
        "Casting to: $deviceName"
    } else {
        "Not connected"
    }
    val statusColor = if (isConnected) Accent else TextSecondary

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(Surface)
            .border(1.dp, SurfaceBorder, RoundedCornerShape(8.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(if (isConnected) Color(0xFF4CAF50) else Color(0xFF666666))
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = statusText,
            color = statusColor,
            fontSize = 14.sp
        )
    }
}

@Composable
fun SectionLabel(text: String) {
    Text(
        text = text,
        color = TextSecondary,
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.sp
    )
}

@Composable
fun StationPicker(
    selectedStation: com.lappycap.android.data.RadioStation,
    enabled: Boolean,
    onStationSelected: (com.lappycap.android.data.RadioStation) -> Unit
) {
    val alpha = if (enabled) 1f else 0.4f

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(max = 320.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(Surface)
            .border(1.dp, SurfaceBorder, RoundedCornerShape(8.dp))
            .verticalScroll(rememberScrollState())
    ) {
        radioStations.forEach { station ->
            val isSelected = station == selectedStation
            val bg = if (isSelected) Accent.copy(alpha = 0.15f) else Color.Transparent
            val textColor = if (isSelected) Accent else TextPrimary

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(enabled = enabled) { onStationSelected(station) }
                    .background(bg)
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isSelected) {
                    Text("▶ ", color = Accent, fontSize = 14.sp)
                }
                Text(
                    text = station.name,
                    color = textColor.copy(alpha = alpha),
                    fontSize = 14.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                )
            }
        }
    }
}

@Composable
fun ScenePicker(
    selectedScene: com.lappycap.android.data.Scene,
    enabled: Boolean,
    onSceneSelected: (com.lappycap.android.data.Scene) -> Unit
) {
    val alpha = if (enabled) 1f else 0.4f

    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        items(scenes) { scene ->
            val isSelected = scene == selectedScene
            val borderColor = if (isSelected) Accent else SurfaceBorder
            val bg = if (isSelected) Accent.copy(alpha = 0.15f) else Surface

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(bg)
                    .border(1.dp, borderColor, RoundedCornerShape(16.dp))
                    .clickable(enabled = enabled) { onSceneSelected(scene) }
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Text(
                    text = scene.name,
                    color = (if (isSelected) Accent else TextPrimary).copy(alpha = alpha),
                    fontSize = 13.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                )
            }
        }
    }
}

@Composable
fun PauseButton(
    isPaused: Boolean,
    enabled: Boolean,
    onToggle: () -> Unit
) {
    val label = if (isPaused) "▶  RESUME" else "⏸  PAUSE"
    val borderColor = if (isPaused) Accent else SurfaceBorder
    val bgColor = if (isPaused) Accent.copy(alpha = 0.15f) else Surface
    val textColor = if (isPaused) Accent else TextPrimary
    val alpha = if (enabled) 1f else 0.4f

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(bgColor)
            .border(1.dp, if (enabled) borderColor else SurfaceBorder, RoundedCornerShape(8.dp))
            .clickable(enabled = enabled, onClick = onToggle),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = textColor.copy(alpha = alpha),
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun ControlsRow(
    enabled: Boolean,
    onPrev: () -> Unit,
    onShuffle: () -> Unit,
    onNext: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterHorizontally)
    ) {
        ControlButton(text = "⏮ PREV", enabled = enabled, onClick = onPrev)
        ControlButton(text = "\uD83D\uDD00 SHUFFLE", enabled = enabled, onClick = onShuffle)
        ControlButton(text = "NEXT ⏭", enabled = enabled, onClick = onNext)
    }
}

@Composable
fun ControlButton(text: String, enabled: Boolean, onClick: () -> Unit) {
    val alpha = if (enabled) 1f else 0.4f

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(Surface)
            .border(1.dp, if (enabled) Accent.copy(alpha = 0.5f) else SurfaceBorder, RoundedCornerShape(8.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 12.dp)
    ) {
        Text(
            text = text,
            color = Accent.copy(alpha = alpha),
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun VolumeSlider(
    volume: Float,
    enabled: Boolean,
    onVolumeChange: (Float) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(Surface)
            .border(1.dp, SurfaceBorder, RoundedCornerShape(8.dp))
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("Volume", color = TextPrimary, fontSize = 14.sp)
            Text(
                text = "${(volume * 100).toInt()}%",
                color = Accent,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Slider(
            value = volume,
            onValueChange = onVolumeChange,
            valueRange = 0f..1f,
            enabled = enabled,
            colors = SliderDefaults.colors(
                thumbColor = Accent,
                activeTrackColor = Accent,
                inactiveTrackColor = SurfaceBorder
            )
        )
    }
}

@Composable
fun TimingSliders(
    cycleDuration: Int,
    blendDuration: Int,
    enabled: Boolean,
    onCycleChange: (Int) -> Unit,
    onBlendChange: (Int) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(Surface)
            .border(1.dp, SurfaceBorder, RoundedCornerShape(8.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Cycle duration
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Cycle Duration", color = TextPrimary, fontSize = 14.sp)
                Text(
                    text = "${cycleDuration}s",
                    color = Accent,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Slider(
                value = cycleDuration.toFloat(),
                onValueChange = { onCycleChange(it.toInt()) },
                valueRange = 5f..120f,
                steps = 22,
                enabled = enabled,
                colors = SliderDefaults.colors(
                    thumbColor = Accent,
                    activeTrackColor = Accent,
                    inactiveTrackColor = SurfaceBorder
                )
            )
        }

        // Blend duration
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Blend Duration", color = TextPrimary, fontSize = 14.sp)
                Text(
                    text = "${blendDuration}s",
                    color = Accent,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Slider(
                value = blendDuration.toFloat(),
                onValueChange = { onBlendChange(it.toInt()) },
                valueRange = 1f..20f,
                steps = 18,
                enabled = enabled,
                colors = SliderDefaults.colors(
                    thumbColor = Accent,
                    activeTrackColor = Accent,
                    inactiveTrackColor = SurfaceBorder
                )
            )
        }
    }
}
