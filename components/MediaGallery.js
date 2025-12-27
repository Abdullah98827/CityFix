import { VideoView, useVideoPlayer } from 'expo-video';
import { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth } from '../backend/firebase';

const { width } = Dimensions.get('window');

export default function MediaGallery({
  photos = [],
  videos = [],
  video = null,
  onRemove,
  showRemove = false
}) {
  // Skip rendering if user is signed out
  if (!auth.currentUser) {
    return null;
  }

  const [fullscreenIndex, setFullscreenIndex] = useState(-1);

  const media = [];
  if (videos && Array.isArray(videos) && videos.length > 0) {
    videos.forEach(uri => media.push({ type: 'video', uri }));
  } else if (video) {
    media.push({ type: 'video', uri: video });
  }
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

  const goNext = () => {
    if (fullscreenIndex < media.length - 1) {
      setFullscreenIndex(fullscreenIndex + 1);
    }
  };

  const goPrevious = () => {
    if (fullscreenIndex > 0) {
      setFullscreenIndex(fullscreenIndex - 1);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {media.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.thumbnailContainer}
            onPress={() => setFullscreenIndex(index)}
          >
            {item.type === 'video' ? (
              <View style={styles.videoThumbnail}>
                <Text style={styles.playIcon}>▶</Text>
                <Text style={styles.videoLabel}>VIDEO</Text>
              </View>
            ) : (
              <Image source={{ uri: item.uri }} style={styles.thumbnail} />
            )}
            {showRemove && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  onRemove && onRemove(index);
                }}
              >
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            )}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.type === 'video' ? 'VIDEO' : 'PHOTO'} {index + 1}/{media.length}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={fullscreenIndex >= 0}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenIndex(-1)}
      >
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setFullscreenIndex(-1)}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          {fullscreenIndex >= 0 && media[fullscreenIndex] && (
            <>
              {fullscreenIndex > 0 && (
                <TouchableOpacity style={[styles.navArrow, styles.leftArrow]} onPress={goPrevious}>
                  <Text style={styles.arrowText}>‹</Text>
                </TouchableOpacity>
              )}
              {fullscreenIndex < media.length - 1 && (
                <TouchableOpacity style={[styles.navArrow, styles.rightArrow]} onPress={goNext}>
                  <Text style={styles.arrowText}>›</Text>
                </TouchableOpacity>
              )}
              <View style={styles.fullscreenContent}>
                {media[fullscreenIndex].type === 'video' ? (
                  <VideoPlayerFullscreen uri={media[fullscreenIndex].uri} />
                ) : (
                  <Image
                    source={{ uri: media[fullscreenIndex].uri }}
                    style={styles.fullscreenImage}
                    resizeMode="contain"
                  />
                )}
                <View style={styles.fullscreenCounter}>
                  <Text style={styles.counterText}>
                    {fullscreenIndex + 1} / {media.length}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

function VideoPlayerFullscreen({ uri }) {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    player.play();
  });

  return (
    <VideoView
      style={styles.fullscreenVideo}
      player={player}
      contentFit="contain"
      fullscreenOptions
      allowsPictureInPicture
    />
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 16 },
  scrollContent: { paddingHorizontal: 16, gap: 12 },
  thumbnailContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 32,
    color: '#fff',
    marginBottom: 4,
  },
  videoLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  removeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  noMedia: {
    height: 120,
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  noMediaText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '500',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
  },
  fullscreenContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
  },
  fullscreenCounter: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  counterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  leftArrow: { left: 20 },
  rightArrow: { right: 20 },
  arrowText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '300',
  },
});