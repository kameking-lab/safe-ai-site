require "json"
require "open3"
require "spaceship"

# Spaceship receives only a short-lived JWT over an anonymous pipe. It never
# reads, normalizes, writes or signs with the integration's private key.
class AscCodemagicToken < Spaceship::ConnectAPI::Token
  def refresh!
    python = ENV.fetch("ASC_SETUP_PYTHON")
    script = File.expand_path("asc_auth.py", __dir__)
    output, _private_stderr, status = Open3.capture3(python, script, "--token-for-pipe")
    raise "Codemagic ASC token generation failed; run the integration preflight" unless status.success?
    data = JSON.parse(output)
    token = data.fetch("token")
    expiration = Integer(data.fetch("expiration"))
    raise "Invalid Codemagic ASC token response" unless token.match?(/\A[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\z/) &&
      expiration > Time.now.to_i + 60 && expiration <= Time.now.to_i + 1200
    @text = token
    @expiration = Time.at(expiration - 30) # Refresh before the actual expiry.
    self
  rescue JSON::ParserError, KeyError, ArgumentError, TypeError
    raise "Invalid Codemagic ASC token response", cause: nil
  end

  # Prevent an accidental object dump from exposing the bearer token.
  def inspect
    "#<AscCodemagicToken [REDACTED]>"
  end
end
