import React from 'react';
import { View } from 'react-native';
import LeafletMap from './LeafletMap';

let MapView: any = LeafletMap;
let Marker: any = () => null;
let Polyline: any = () => null;
let Circle: any = () => null;
let MapCallout: any = ({ children }: any) => <View>{children}</View>;
let PROVIDER_GOOGLE: any = 'google';

export { Marker, Polyline, Circle, MapCallout, PROVIDER_GOOGLE };
export default MapView;
