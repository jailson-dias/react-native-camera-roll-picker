import React, { Component } from 'react'
import {
    CameraRoll,
    Platform,
    StyleSheet,
    View,
    Text,
    ActivityIndicator,
    FlatList,
    PermissionsAndroid,
    Alert
} from 'react-native'
import PropTypes from 'prop-types'

import ImageItem from './ImageItem'

class CameraRollPicker extends Component {
    constructor(props) {
        super(props)

        this.state = {
            images: [],
            selectedImages: this.props.selected,
            selected: [],
            lastCursor: null,
            initialLoading: true,
            loadingMore: false,
            noMore: false
        }
    }

    _requestPermission = () => {
        PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        )
            .then(granted => {
                if (granted) {
                    this.fetch()
                } else {
                    Alert.alert(
                        'Permissão não concedida',
                        'Sem a permissão de acesso ao armazenamento você não vai conseguir selecionar as fotos!'
                    )
                }
            })
            .catch(err => {
                Alert.alert(
                    'Permissão não concedida',
                    'Sem a permissão de acesso ao armazenamento você não vai conseguir selecionar as fotos!'
                )
            })
    }

    componentWillMount() {
        if (Platform.OS == 'ios') {
            this.fetch()
        } else {
            PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
            ).then(granted => {
                if (granted) {
                    this.fetch()
                } else {
                    this._requestPermission()
                }
            })
        }
    }

    fetch() {
        if (!this.state.loadingMore) {
            this.setState({ loadingMore: true }, () => {
                this._fetch()
            })
        }
    }

    _fetch() {
        var { groupTypes, assetType } = this.props

        var fetchParams = {
            first: 1000,
            groupTypes: groupTypes,
            assetType: assetType
        }

        if (Platform.OS === 'android') {
            // not supported in android
            delete fetchParams.groupTypes
        }

        if (this.state.lastCursor) {
            fetchParams.after = this.state.lastCursor
        }

        CameraRoll.getPhotos(fetchParams).then(
            data => this._appendImages(data),
            e => console.log(e)
        )
    }

    _appendImages(data) {
        var assets = data.edges
        var newState = {
            loadingMore: false,
            initialLoading: false
        }

        if (!data.page_info.has_next_page) {
            newState.noMore = true
        }

        if (assets.length > 0) {
            newState.lastCursor = data.page_info.end_cursor
            newState.images = this.state.images.concat(assets)
        }

        this.setState(newState)
    }

    render() {
        var { images } = this.state
        var {
            initialListSize,
            pageSize,
            removeClippedSubviews,
            imageMargin,
            backgroundColor,
            emptyText,
            emptyTextStyle,
            loader,
            listHeader,
            listEmpty
        } = this.props

        if (this.state.initialLoading) {
            return (
                <View style={[styles.loader, { backgroundColor }]}>
                    {loader || <ActivityIndicator />}
                </View>
            )
        }

        var listViewOrEmptyText =
            images.length > 0 ? (
                <FlatList
                    style={{ flex: 1 }}
                    numColumns={pageSize}
                    keyExtractor={(item, index) => `rncrp_item_${index}`}
                    initialNumToRender={pageSize * initialListSize}
                    removeClippedSubviews={removeClippedSubviews}
                    ListHeaderComponent={listHeader}
                    ListEmptyComponent={listEmpty}
                    ListFooterComponent={this._renderFooterSpinner.bind(this)}
                    onEndReached={this._onEndReached.bind(this)}
                    data={images}
                    renderItem={({ item, index }) =>
                        this._renderImage(item, index)
                    }
                />
            ) : (
                <Text style={[{ textAlign: 'center' }, emptyTextStyle]}>
                    {emptyText}
                </Text>
            )

        return (
            <View
                style={[
                    styles.wrapper,
                    {
                        padding: imageMargin,
                        paddingRight: 0,
                        backgroundColor: backgroundColor
                    }
                ]}
            >
                {listViewOrEmptyText}
            </View>
        )
    }

    _renderImage(item, index) {
        var { selected } = this.state
        var {
            imageMargin,
            selectedMarker,
            imagesPerRow,
            containerWidth,
            ratio
        } = this.props

        var uri = item.node.image.uri
        var isSelected = selected.indexOf(index) >= 0

        return (
            <ImageItem
                key={uri}
                item={item}
                selected={isSelected}
                imageMargin={imageMargin}
                selectedMarker={selectedMarker}
                imagesPerRow={imagesPerRow}
                containerWidth={containerWidth}
                onClick={image => this._selectImage.bind(this)(image, index)}
                ratio={ratio}
            />
        )
    }

    _renderFooterSpinner() {
        if (!this.state.noMore) {
            return <ActivityIndicator style={styles.spinner} />
        }
        return null
    }

    _onEndReached() {
        if (!this.state.noMore) {
            this.fetch()
        }
    }

    _selectImage(image, index) {
        var {
            maximum,
            callback,
            selectSingleItem,
            callbackMaximum
        } = this.props

        var { selected, selectedImages, images } = this.state
        var indexInSelected = selected.indexOf(index)

        if (indexInSelected >= 0) {
            selected.splice(indexInSelected, 1)

            // remove from selected images
            var indexInSelectedImages = selectedImages
                .map(img => img.uri)
                .indexOf(images[index].node.image.uri)
            selectedImages.splice(indexInSelectedImages, 1)
        } else {
            if (selectSingleItem) {
                selected.splice(0, selected.length)
                selectedImages.splice(0, indexInSelectedImages)
            }
            if (selected.length < maximum) {
                selected.push(index)
                selectedImages.push(image)
            } else {
                // maximo
                if (callbackMaximum) callbackMaximum()
            }
        }

        this.setState({
            selected: selected,
            selectedImages: selectedImages
        })

        if (callback) callback(selectedImages, image)
    }

    _nEveryRow(data, n) {
        var result = [],
            temp = []

        for (var i = 0; i < data.length; ++i) {
            if (i > 0 && i % n === 0) {
                result.push(temp)
                temp = []
            }
            temp.push(data[i])
        }

        if (temp.length > 0) {
            while (temp.length !== n) {
                temp.push(null)
            }
            result.push(temp)
        }

        return result
    }
}

const styles = StyleSheet.create({
    wrapper: {
        flexGrow: 1
    },
    loader: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    row: {
        flexDirection: 'row',
        flex: 1
    },
    marker: {
        position: 'absolute',
        top: 5,
        backgroundColor: 'transparent'
    }
})

CameraRollPicker.propTypes = {
    scrollRenderAheadDistance: PropTypes.number,
    initialListSize: PropTypes.number,
    pageSize: PropTypes.number,
    removeClippedSubviews: PropTypes.bool,
    groupTypes: PropTypes.oneOf([
        'Album',
        'All',
        'Event',
        'Faces',
        'Library',
        'PhotoStream',
        'SavedPhotos'
    ]),
    maximum: PropTypes.number,
    assetType: PropTypes.oneOf(['Photos', 'Videos', 'All']),
    selectSingleItem: PropTypes.bool,
    imagesPerRow: PropTypes.number,
    imageMargin: PropTypes.number,
    containerWidth: PropTypes.number,
    callback: PropTypes.func,
    selected: PropTypes.array,
    selectedMarker: PropTypes.element,
    backgroundColor: PropTypes.string,
    emptyText: PropTypes.string,
    emptyTextStyle: Text.propTypes.style,
    loader: PropTypes.node,
    ratio: PropTypes.number,
    callbackMaximum: PropTypes.func,
    listEmpty: PropTypes.func || PropTypes.element || PropTypes.node,
    listHeader: PropTypes.func || PropTypes.element || PropTypes.node
}

CameraRollPicker.defaultProps = {
    scrollRenderAheadDistance: 500,
    initialListSize: 1,
    pageSize: 3,
    removeClippedSubviews: true,
    groupTypes: 'SavedPhotos',
    maximum: 15,
    imagesPerRow: 3,
    imageMargin: 5,
    selectSingleItem: false,
    assetType: 'Photos',
    backgroundColor: 'white',
    selected: [],
    callback: function(selectedImages, currentImage) {
        console.log(currentImage)
        console.log(selectedImages)
    },
    emptyText: 'No photos.',
    ratio: 1,
    callbackMaximum: function() {
        console.log('You have already selected all the photos allowed')
    }
}

export default CameraRollPicker
