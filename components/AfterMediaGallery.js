import { VideoView, useVideoPlayer } from 'expo-video';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AfterMediaGallery({ photos = [], video = null, title = 'After Media', onRemove, showRemove = false }) {
  const media = [];
  if (video) media.push({ type: 'video', uri: video });
  if (photos && photos.length > 0) {
    photos.forEach(uri => media.push({ type: 'photo', uri }));
  }

  if (media.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.sectionTitle}>{title}</Text>}
        <View style={styles.noMedia}>
          <Text style={styles.noMediaText}>No media available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.type === 'video' ? 'VIDEO' : 'PHOTO'} {index + 1}/{media.length}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
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
  container: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  scrollView: { marginHorizontal: -4 },
  scrollContent: { paddingHorizontal: 4 },
  mediaContainer: {
    marginRight: 12,
    position: 'relative',
  },
  media: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  remove: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  badge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  noMedia: {
    padding: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  noMediaText: { fontSize: 15, color: '#94a3b8' },
});