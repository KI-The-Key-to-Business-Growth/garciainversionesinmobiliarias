export type TwoclicsRegion = 'AR' | 'US';

export type TwoclicsMarket = {
  region: TwoclicsRegion;
  label: string;
  country: string;
  city: string;
  enabled: boolean;
};

export type TwoclicsApiResponseStatus = 'success' | 'fail' | string;

export type TwoclicsErrorResponse = {
  status?: TwoclicsApiResponseStatus;
  description?: string;
  errors?: string[];
};

export type TwoclicsHealthResponse = {
  status?: TwoclicsApiResponseStatus;
  description?: string;
  service?: string;
  data?: unknown;
};

export type TwoclicsCollectionResponse<T, K extends string> = {
  status?: TwoclicsApiResponseStatus;
} & Record<K, T[]>;

export type TwoclicsImage = {
  imageId?: string;
  name?: string;
  url?: string;
  thumbnailName?: string;
  thumbnailUrl?: string;
  useVirtualized?: boolean;
  virtualizedUrl?: string;
  thumbnailVirtualizedUrl?: string;
};

export type TwoclicsState = {
  stateId?: number;
  name?: string;
};

export type TwoclicsCity = {
  cityId?: number;
  name?: string;
};

export type TwoclicsNeighborhood = {
  neighborhoodId?: number;
  name?: string;
};

export type TwoclicsAgent = {
  userId?: number;
  email?: string;
  fullName?: string;
  role?: string;
  cellphone?: string;
  image?: TwoclicsImage;
};

export type TwoclicsRealEstate = {
  realEstateId?: number;
  name?: string;
  phoneOne?: string;
  phoneTwo?: string;
  email?: string;
  address?: string;
  web?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  image?: TwoclicsImage;
  state?: TwoclicsState;
  city?: TwoclicsCity;
  neighborhood?: TwoclicsNeighborhood;
};

export type TwoclicsPropertyType = {
  typeId?: number;
  name?: string;
  appId?: string;
  group?: string;
};

export type TwoclicsAmenity = {
  amenitieId?: number | string;
  name?: string;
  appId?: string;
  type?: string;
};

export type TwoclicsMetadata = {
  metaKey?: string;
  metaValue?: string;
  metaId?: string;
};

export type TwoclicsWebListing = 'NONE' | 'DESTACADO' | 'SIMPLE' | string;

export type TwoclicsOperationType =
  | 'VENTA'
  | 'ALQUILER_PERMANENTE'
  | 'ALQUILER_TEMPORARIO'
  | string;

export type TwoclicsPropertyListItem = {
  propertyId?: number;
  agent?: Record<string, unknown>;
  address?: string;
  alternativeAddress?: string;
  number?: string;
  publishDate?: string;
  modifiedDate?: string;
  lat?: number;
  long?: number;
  url?: string;
  folder?: string;
  price?: number;
  currency?: string;
  hidePrice?: boolean;
  operationType?: TwoclicsOperationType;
  amountRoom?: number;
  amountBedroom?: number;
  aptCredit?: boolean;
  coveredArea?: number;
  uncoveredArea?: number;
  semiCoveredArea?: number;
  totalArea?: number;
  status?: string;
  realEstate?: Record<string, unknown>;
  statusDiffusion?: string;
  webListing?: TwoclicsWebListing;
  propertyType?: TwoclicsPropertyType;
  state?: TwoclicsState;
  city?: TwoclicsCity;
  neighborhood?: TwoclicsNeighborhood;
  images?: TwoclicsImage[];
  meta_data?: TwoclicsMetadata[];
  networkAds?: TwoclicsNetworkAd[];
};

export type TwoclicsDevelopmentParent = {
  developmentId?: number;
  title?: string;
  status?: Record<string, unknown>;
  meta_data?: Record<string, unknown>[];
};

export type TwoclicsPropertyDetail = Omit<
  TwoclicsPropertyListItem,
  'agent' | 'realEstate'
> & {
  agent?: TwoclicsAgent;
  realEstate?: TwoclicsRealEstate;
  amenities?: TwoclicsAmenity[];
  developmentParent?: TwoclicsDevelopmentParent;
};

export type TwoclicsPropertyFilters = {
  address?: string;
  operation_type?: TwoclicsOperationType | TwoclicsOperationType[];
  amount_bedroom?: number | number[];
  amount_room?: number | number[];
  aptCredit?: boolean;
  currency?: string;
  max_price?: number;
  min_price?: number;
  // number/number[] = typeId (uso interno/legacy); string = appId, el único formato que la API
  // realmente filtra correctamente — ver `resolvePropertyTypeAppId` en lib/2clics/listings.ts.
  property_type?: number | number[] | string;
  amenities?: number | number[];
  state?: number | number[];
  city?: number | number[];
  neighborhood?: number | number[];
  realEstate?: number;
  webListing?: 'DESTACADO' | 'SIMPLE';
};

export type TwoclicsGetPropertiesRequest = {
  filters?: TwoclicsPropertyFilters;
  offset?: number;
  limit?: number;
};

export type TwoclicsGetPropertiesResponse = {
  status?: TwoclicsApiResponseStatus;
  properties?: TwoclicsPropertyListItem[];
  count?: number;
  offset?: number;
  limit?: number;
};

export type TwoclicsGetPropertyByIdResponse = {
  status?: TwoclicsApiResponseStatus;
  property?: TwoclicsPropertyDetail;
};

export type TwoclicsGetNetworkByIdResponse = {
  status?: TwoclicsApiResponseStatus;
  network?: TwoclicsNetworkAd;
  data?: TwoclicsNetworkAd;
  url?: string;
};

export type TwoclicsDevelopmentType = {
  typeId?: number;
  name?: string;
  appId?: string;
  mlId?: string;
  zpId?: string;
  apId?: string;
};

export type TwoclicsDevelopmentStatus = {
  statusId?: number;
  name?: string;
  appId?: string;
  mlId?: string;
  zpId?: string;
  apId?: string;
};

export type TwoclicsDevelopmentPropertyRef = {
  propertyId?: string;
  address?: string;
  price?: string;
  currency?: string;
  amountRoom?: string;
  coveredArea?: string;
  uncoveredArea?: string;
  totalArea?: string;
  amountBedroom?: string;
  images?: TwoclicsImage[];
  propertyType?: TwoclicsPropertyType | Record<string, unknown>;
};

export type TwoclicsDevelopmentListItem = {
  developmentId?: number;
  title?: string;
  address?: string;
  number?: string;
  publishDate?: string;
  modifiedDate?: string;
  lat?: number;
  long?: number;
  url?: string;
  state?: TwoclicsState;
  city?: TwoclicsCity;
  neighborhood?: TwoclicsNeighborhood;
  type?: TwoclicsDevelopmentType;
  status?: TwoclicsDevelopmentStatus;
  meta_data?: TwoclicsMetadata[];
  images?: TwoclicsImage[];
  properties?: TwoclicsDevelopmentPropertyRef[];
};

export type TwoclicsDevelopmentDetail = TwoclicsDevelopmentListItem & {
  agent?: TwoclicsAgent;
  realEstate?: TwoclicsRealEstate;
  plans?: TwoclicsImage[];
  amenities?: TwoclicsAmenity[];
};

export type TwoclicsGetDevelopmentsResponse = {
  status?: TwoclicsApiResponseStatus;
  developments?: TwoclicsDevelopmentListItem[];
};

export type TwoclicsGetDevelopmentByIdResponse = {
  status?: TwoclicsApiResponseStatus;
  development?: TwoclicsDevelopmentDetail;
};

export type TwoclicsLocationSuggestion = {
  stateId?: number;
  cityId?: number;
  neighborhoodId?: number;
  label?: string;
};

export type TwoclicsNetworkAd = {
  url?: string;
  networkId?: string;
  houzezId?: string;
};

export type TwoclicsAmountPerCity = {
  id?: number;
  name?: string;
  quantity?: number;
};

export type TwoclicsAmountPerNeighborhood = {
  id?: number;
  name?: string;
  quantity?: number;
};

export type TwoclicsAmountPerPropertyType = {
  propertyTypeId?: number;
  appId?: string;
  name?: string;
  quantity?: number;
};

export type TwoclicsLeadMessageInput = {
  name: string;
  email: string;
  message: string;
  phone?: string;
  property_app_id?: number;
  development_app_id?: number;
  agent?: string;
  realEstate?: string;
};

export type TwoclicsLeadMessageResponse = {
  status?: TwoclicsApiResponseStatus;
  message?: string;
};

export type PublicImage = {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  displayUrl: string;
  displayThumbnailUrl: string;
  useVirtualized: boolean;
};

export type PublicMetadata = {
  title?: string;
  description?: string;
  rooms?: string;
  bedrooms?: string;
  bathrooms?: string;
  toilettes?: string;
  garages?: string;
  garageType?: string;
  expenses?: string;
  expensesCurrency?: string;
  floor?: string;
  unit?: string;
  disposition?: string;
  orientation?: string;
  coveredArea?: string;
  semiCoveredArea?: string;
  totalArea?: string;
  landArea?: string;
  balcony?: string;
  balconyArea?: string;
  condition?: string;
  antiquity?: string;
  constructionDate?: string;
  deliveryDate?: string;
  minPrice?: string;
  maxPrice?: string;
  minArea?: string;
  maxArea?: string;
  videoUrl?: string;
  tourUrl?: string;
};

export type PublicMetadataDiagnostics = {
  known: Record<string, string>;
  internalKeysPresent: string[];
  unknownPublicKeys: string[];
};

export type PublicLocation = {
  state?: TwoclicsState;
  city?: TwoclicsCity;
  neighborhood?: TwoclicsNeighborhood;
};

export type PublicProperty = {
  source: '2clics-api';
  region: TwoclicsRegion;
  marketLabel: string;
  propertyId: number | null;
  title: string;
  address: string;
  alternativeAddress: string;
  number: string;
  publishDate: string;
  modifiedDate: string;
  lat: number | null;
  long: number | null;
  url: string;
  description: string;
  price: number | null;
  currency: string;
  hidePrice: boolean;
  operationType: string;
  amountRoom: number | null;
  amountBedroom: number | null;
  aptCredit: boolean | null;
  coveredArea: number | null;
  uncoveredArea: number | null;
  semiCoveredArea: number | null;
  totalArea: number | null;
  status: string;
  statusDiffusion: string;
  webListing: string;
  propertyType: TwoclicsPropertyType | null;
  location: PublicLocation;
  images: PublicImage[];
  amenities: TwoclicsAmenity[];
  metadata: PublicMetadata;
  developmentParent: {
    developmentId: number | null;
    title: string;
    statusName: string;
  } | null;
};

export type PublicDevelopmentUnit = {
  propertyId: string;
  address: string;
  price: number | null;
  currency: string;
  amountRoom: number | null;
  amountBedroom: number | null;
  coveredArea: number | null;
  uncoveredArea: number | null;
  totalArea: number | null;
  propertyType: TwoclicsPropertyType | null;
  images: PublicImage[];
};

export type PublicDevelopment = {
  source: '2clics-api';
  region: TwoclicsRegion;
  marketLabel: string;
  developmentId: number | null;
  title: string;
  address: string;
  number: string;
  publishDate: string;
  modifiedDate: string;
  lat: number | null;
  long: number | null;
  url: string;
  description: string;
  location: PublicLocation;
  type: TwoclicsDevelopmentType | null;
  status: TwoclicsDevelopmentStatus | null;
  images: PublicImage[];
  plans: PublicImage[];
  amenities: TwoclicsAmenity[];
  metadata: PublicMetadata;
  properties: PublicDevelopmentUnit[];
};
