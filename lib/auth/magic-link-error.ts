type MagicLinkError = {
  code?: string;
  status?: number;
};

export function getMagicLinkErrorMessage(error: MagicLinkError) {
  if (error.code === "over_email_send_rate_limit") {
    return "Too many sign-in emails were requested. Please try again in about an hour.";
  }

  if (error.code === "over_request_rate_limit" || error.status === 429) {
    return "Please wait one minute before requesting another sign-in link.";
  }

  if (error.code === "email_address_not_authorized") {
    return "This email cannot receive sign-in links yet. Please contact DINKFRAME.";
  }

  if (error.code === "email_provider_disabled") {
    return "Email sign-in is temporarily unavailable. Please contact DINKFRAME.";
  }

  return "We couldn't send the sign-in link. Please wait a moment and try again.";
}
