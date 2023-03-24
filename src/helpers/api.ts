import axios, { AxiosInstance } from "axios";
import { IAssetData, IGasPrices, IParsedTx } from "./types";

const api: AxiosInstance = axios.create({
  baseURL: "https://ethereum-api.xyz",
  timeout: 30000, // 30 secs
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export async function apiGetAccountAssets(address: string, chainId: number): Promise<IAssetData[]> {
  return [];
}

export async function apiGetAccountTransactions(
  address: string,
  chainId: number,
): Promise<IParsedTx[]> {
  return [];
}

export const apiGetAccountNonce = async (address: string, chainId: number): Promise<string> => {
  return "0";
};

export const apiGetGasPrices = async (): Promise<IGasPrices> => {
  const response = await api.get(`/gas-prices`);
  const { result } = response.data;
  return result;
};
