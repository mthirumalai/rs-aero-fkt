"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CONTACT_TYPES = [
  { value: "issue", label: "Reporting an issue" },
  { value: "idea", label: "I have an idea for you" },
  { value: "kudos", label: "Kudos" },
  { value: "other", label: "Something else" },
];

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const [form, setForm] = useState({
    type: "",
    name: "",
    email: "",
    description: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setAttachments(files);
  }

  async function uploadFile(file: File): Promise<string> {
    setUploadProgress(`Uploading ${file.name}...`);

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "photo", // Use photo bucket for attachments
        filename: file.name,
        contentType: file.type || "application/octet-stream",
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to prepare file upload");
    }

    const { uploadUrl, key } = await res.json();

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to upload ${file.name}`);
    }

    return key;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.type || !form.name || !form.email || !form.description) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload any attachments first
      let attachmentKeys: string[] = [];
      if (attachments.length > 0) {
        attachmentKeys = await Promise.all(
          attachments.map(file => uploadFile(file))
        );
      }

      setUploadProgress("Sending message...");

      // Send contact form data
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          attachmentKeys,
          attachmentNames: attachments.map(f => f.name),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to send message");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  }

  if (success) {
    return (
      <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
        <p className="text-2xl font-bold text-green-800 mb-2">Message Sent!</p>
        <p className="text-green-700">
          Thank you for your feedback. We&apos;ll get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      {uploadProgress && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm">
          {uploadProgress}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="type">What would you like to tell us? *</Label>
        <select
          id="type"
          value={form.type}
          onChange={(e) => update("type", e.target.value)}
          required
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select...</option>
          {CONTACT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Your name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="your.email@example.com"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Please describe your issue, idea, or feedback in detail..."
          rows={6}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="attachments">
          Attachments{" "}
          <span className="text-xs text-muted-foreground">(optional, max 5MB each)</span>
        </Label>
        <Input
          id="attachments"
          type="file"
          multiple
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        {attachments.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Selected: {attachments.map(f => f.name).join(", ")}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}