// Reusable photo gallery with swipe functionality and photo counter
import { useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function PhotosGallery({ photos = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Calculate which photo is currently visible based on scroll position
  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  // If no photos, shows placeholder
  if (photos.length === 0) {
    return (
      <View style={styles.noPhoto}>
        <Text style={styles.noPhotoText}>No photos</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Photo Gallery */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {photos.map((uri, index) => (
          <Image key={index} source={{ uri }} style={styles.photo} />
        ))}
      </ScrollView>

      {/* Photo Counter Badge */}
      {photos.length > 1 && (
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {photos.length}
          </Text>
        </View>
      )}

      {/* Navigation Arrows (optional - shows user there are more photos) */}
      {photos.length > 1 && (
        <>
          {currentIndex > 0 && (
            <View style={[styles.arrow, styles.leftArrow]}>
              <Text style={styles.arrowText}>←</Text>
            </View>
          )}
          {currentIndex < photos.length - 1 && (
            <View style={[styles.arrow, styles.rightArrow]}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  photo: {
    width,
    height: 380,
  },
  noPhoto: {
    width,
    height: 380,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '500',
  },
  counterBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
  },
  leftArrow: {
    left: 16,
  },
  rightArrow: {
    right: 16,
  },
  arrowText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});