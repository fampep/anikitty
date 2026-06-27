import axios from "axios";
import { CLIENT_HEADER, CLIENT_HEADER_VALUE } from "@/lib/anti-scrape";

export const api = axios.create({
  headers: { [CLIENT_HEADER]: CLIENT_HEADER_VALUE },
});
