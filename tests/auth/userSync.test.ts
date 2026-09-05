// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import axiosClient from "@/services/axiosClient";
import { userApi } from "@/services/userApi";

describe("Google user synchronization", () => {
  beforeEach(() => window.localStorage.clear());

  it("persists the profile returned by the authenticated /users/me endpoint", async () => {
    const profile = {
      email: "lan@example.com",
      fullName: "Lan Nguyen",
      roles: ["USER"],
    };
    axiosClient.defaults.adapter = async (config) => ({
      config,
      data: profile,
      headers: {},
      status: 200,
      statusText: "OK",
    });

    await expect(userApi.syncCurrentUser()).resolves.toEqual(profile);
    expect(
      JSON.parse(
        window.localStorage.getItem("haloticket_user_profile") ?? "null",
      ),
    ).toEqual(profile);
  });
});
