import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Search,
  X,
  Check,
  Compass,
} from 'lucide-react-native';
import {
  ILLUSTRATIONS,
  ILLUSTRATION_CATEGORIES,
  IllustrationItem,
} from '../../constants/illustrations';
import { IllustrationAvatar } from './IllustrationAvatar';
import { colors, radii } from '../../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface IllustrationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedIllustrationId?: string | null;
  onSelect: (illustrationId: string | null) => void;
  userName?: string;
}

export const IllustrationPickerModal: React.FC<IllustrationPickerModalProps> = ({
  visible,
  onClose,
  selectedIllustrationId,
  onSelect,
  userName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [previewId, setPreviewId] = useState<string | null>(selectedIllustrationId || null);

  // Sync preview with current selection when opened
  React.useEffect(() => {
    if (visible) {
      setPreviewId(selectedIllustrationId || null);
      setSearchQuery('');
      setActiveCategory('all');
    }
  }, [visible, selectedIllustrationId]);

  // Filtered illustrations based on search and category
  const filteredIllustrations = useMemo(() => {
    let list = [...ILLUSTRATIONS];

    if (activeCategory !== 'all') {
      list = list.filter((item) => item.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return list;
  }, [activeCategory, searchQuery]);

  const handleApply = () => {
    onSelect(previewId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {/* Top Handle */}
              <View style={styles.handle} />

              {/* Live Preview Bar */}
              <View style={styles.previewBar}>
                <IllustrationAvatar
                  avatar={previewId}
                  name={userName}
                  size={64}
                />
                <View style={styles.previewTextCol}>
                  <Text style={styles.previewLabel}>Current Selection</Text>
                  <Text style={styles.previewName} numberOfLines={1}>
                    {previewId
                      ? ILLUSTRATIONS.find((i) => i.id === previewId)?.name || 'Illustration'
                      : 'Select an illustration'}
                  </Text>
                </View>
              </View>

              {/* Google-Style Search Input */}
              <View style={styles.searchBar}>
                <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search illustrations..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && Platform.OS !== 'ios' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Category Pills Bar */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesScroll}
                style={styles.categoriesContainer}
              >
                {ILLUSTRATION_CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        isActive && styles.categoryChipActive,
                      ]}
                      onPress={() => setActiveCategory(cat.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          isActive && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Illustrations Grid Container */}
              <View style={styles.carouselWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.illustrationsScroll}
                >
                  {filteredIllustrations.length === 0 ? (
                    <View style={styles.emptyWrap}>
                      <Compass size={32} color="#94A3B8" />
                      <Text style={styles.emptyText}>No illustrations matching "{searchQuery}"</Text>
                    </View>
                  ) : (
                    // Render in 3 neat rows matching the Google UI
                    [0, 1, 2].map((rowIndex) => (
                      <View key={`row-${rowIndex}`} style={styles.rowCol}>
                        {filteredIllustrations
                          .filter((_, idx) => idx % 3 === rowIndex)
                          .map((item) => {
                            const isSelected = previewId === item.id;
                            return (
                              <TouchableOpacity
                                key={item.id}
                                style={[
                                  styles.itemCircleWrap,
                                  isSelected && styles.itemCircleWrapSelected,
                                ]}
                                onPress={() => setPreviewId(item.id)}
                                activeOpacity={0.75}
                              >
                                <IllustrationAvatar
                                  avatar={item.id}
                                  size={60}
                                />
                                {isSelected && (
                                  <View style={styles.checkBadge}>
                                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>

              {/* Bottom Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleApply}
                  activeOpacity={0.85}
                >
                  <Check size={17} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Save Profile Picture</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    backgroundColor: '#18181B', // Premium dark theme matching Google illustrations picker
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#3F3F46',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  previewTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A1A1AA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F4F4F5',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 46,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#F4F4F5',
    height: '100%',
  },
  categoriesContainer: {
    maxHeight: 38,
    marginBottom: 14,
  },
  categoriesScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 10,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#27272A',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  categoryChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  categoryChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  carouselWrapper: {
    height: 236,
    justifyContent: 'center',
    marginVertical: 4,
  },
  illustrationsScroll: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 12,
  },
  rowCol: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemCircleWrap: {
    position: 'relative',
    padding: 3,
    borderRadius: 36,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  itemCircleWrapSelected: {
    borderColor: '#10B981',
    transform: [{ scale: 1.05 }],
  },
  checkBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#18181B',
  },
  emptyWrap: {
    width: SCREEN_WIDTH - 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#A1A1AA',
    marginTop: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radii.md,
    backgroundColor: '#27272A',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4D4D8',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radii.md,
    backgroundColor: '#059669',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
