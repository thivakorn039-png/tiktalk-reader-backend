package com.tiktalk.reader.presentation.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun SettingsScreen(viewModel: SettingsViewModel = hiltViewModel()) {
    val settings by viewModel.settings.collectAsState()
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState())
    ) {
        Text(
            text = "Settings",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        Text("Read Events", fontWeight = FontWeight.Bold)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Switch(
                checked = settings.readComments,
                onCheckedChange = { viewModel.updateSettings(settings.copy(readComments = it)) }
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Read Comments")
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Switch(
                checked = settings.readGifts,
                onCheckedChange = { viewModel.updateSettings(settings.copy(readGifts = it)) }
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Read Gifts")
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Switch(
                checked = settings.readFollowers,
                onCheckedChange = { viewModel.updateSettings(settings.copy(readFollowers = it)) }
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Read Followers")
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text("Voice Settings", fontWeight = FontWeight.Bold)
        Text("Speed: ${settings.speechSpeed}")
        Slider(
            value = settings.speechSpeed,
            onValueChange = { viewModel.updateSettings(settings.copy(speechSpeed = it)) },
            valueRange = 0.5f..2.0f
        )
        
        Text("Pitch: ${settings.speechPitch}")
        Slider(
            value = settings.speechPitch,
            onValueChange = { viewModel.updateSettings(settings.copy(speechPitch = it)) },
            valueRange = 0.5f..2.0f
        )

        Spacer(modifier = Modifier.height(16.dp))
        
        Text("Templates", fontWeight = FontWeight.Bold)
        OutlinedTextField(
            value = settings.commentTemplate,
            onValueChange = { viewModel.updateSettings(settings.copy(commentTemplate = it)) },
            label = { Text("Comment Template") },
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
        )
        OutlinedTextField(
            value = settings.giftTemplate,
            onValueChange = { viewModel.updateSettings(settings.copy(giftTemplate = it)) },
            label = { Text("Gift Template") },
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
        )
        OutlinedTextField(
            value = settings.followTemplate,
            onValueChange = { viewModel.updateSettings(settings.copy(followTemplate = it)) },
            label = { Text("Follow Template") },
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
        )
        
        Spacer(modifier = Modifier.height(32.dp))
    }
}