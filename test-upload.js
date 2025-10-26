#!/usr/bin/env node

// Simple test script to upload an image and test Telegram notifications
const fs = require("fs");
const path = require("path");

async function testUpload() {
  try {
    console.log("🧪 Testing image upload with Telegram notifications...");

    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xff, 0xff, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    console.log("📸 Created test image data");

    // Prepare form data using native FormData
    const form = new FormData();
    form.append(
      "image",
      new Blob([testImageBuffer], { type: "image/png" }),
      "test-notification.png"
    );

    // Upload to the worker
    const uploadUrl =
      "https://uploader-worker-v2-prod.haoweiw370.workers.dev/upload";
    console.log("📤 Uploading to:", uploadUrl);

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: form,
    });

    console.log("📡 Response status:", response.status);

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Upload successful!");
      console.log("📋 Response:", JSON.stringify(result, null, 2));

      if (result.success) {
        console.log("🎉 Telegram notification should have been sent!");
        console.log("📱 Check your Telegram chat for the notification.");
      }
    } else {
      const errorText = await response.text();
      console.error("❌ Upload failed:", response.status);
      console.error("❌ Error details:", errorText);
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
  }
}

// Run the test
testUpload();
