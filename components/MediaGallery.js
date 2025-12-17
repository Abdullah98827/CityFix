// components/MediaGallery.js — UPDATED WITH REMOVE SUPPORT
import { VideoView, useVideoPlayer } from 'expo-video';
import { useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function MediaGallery({ photos = [], video = null, onRemove, showRemove = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  const media = [];
  if (video) media.push({ type: 'video', uri: video });
  if (photos && photos.length > 0) {
    photos.forEach(uri => media.push({ type: 'photo', uri }));
  }

  if (media.length === 0) {
    return (
      <View style={styles.noMedia}>
        <Text style={styles.noMediaText}>No media available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {media.map((item, index) => (
          <View key={index} style={styles.mediaContainer}>
            {item.type === 'video' ? (
              <VideoPlayer uri={item.uri} />
            ) : (
              <Image source={{ uri: item.uri }} style={styles.media} />
            )}
            {showRemove && (
              <TouchableOpacity style={styles.remove} onPress={() => onRemove && onRemove(index)}>
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {media.length > 1 && (
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {media.length}
          </Text>
        </View>
      )}

      <View style={styles.typeBadge}>
        <Text style={styles.typeText}>
          {media[currentIndex]?.type === 'video' ? 'VIDEO' : 'PHOTO'}
        </Text>
      </View>
    </View>
  );
}

function VideoPlayer({ uri }) {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    player.play();
  });

  return (
    <VideoView
      style={styles.media}
      player={player}
      fullscreenOptions
      allowsPictureInPicture
    />
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  mediaContainer: { width, height: 380, position: 'relative' },
  media: { width, height: 380 },
  remove: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#EF4444',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  noMedia: {
    width,
    height: 380,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMediaText: { color: '#94a3b8', fontSize: 18, fontWeight: '500' },
  counterBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  typeBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});