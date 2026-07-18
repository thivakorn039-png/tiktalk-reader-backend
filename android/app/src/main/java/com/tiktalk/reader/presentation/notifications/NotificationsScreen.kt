package com.tiktalk.reader.presentation.notifications

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tiktalk.reader.data.models.TikTokEvent

@Composable
fun NotificationsScreen(viewModel: NotificationsViewModel = hiltViewModel()) {
    val events by viewModel.events.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Recent Events",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        if (events.isEmpty()) {
            Text("No events yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(events) { event ->
                    EventCard(event)
                }
            }
        }
    }
}

@Composable
fun EventCard(event: TikTokEvent) {
    if (event is TikTokEvent.Status) return
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            when (event) {
                is TikTokEvent.Comment -> {
                    Text("💬 ${event.user}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Text(event.message, modifier = Modifier.padding(top = 4.dp))
                }
                is TikTokEvent.Gift -> {
                    Text("🎁 ${event.user}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary)
                    Text("Sent ${event.gift} x${event.count}", modifier = Modifier.padding(top = 4.dp))
                }
                is TikTokEvent.Follow -> {
                    Text("❤️ ${event.user} followed", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.tertiary)
                }
                else -> {}
            }
        }
    }
}