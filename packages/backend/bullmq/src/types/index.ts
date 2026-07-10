export interface TEmailOtp {
  email: string;
  otp: string;
}

export interface TSingleMedia {
  publicId: string;
}
export interface TMultipleMedia {
  publicIds: string[];
  retryCount?: number;
}

export type TCreateMedia = TSingleMedia & Record<string, unknown>;
