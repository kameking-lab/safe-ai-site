require "minitest/autorun"
require "minitest/mock"
require "openssl"
require "jwt"

# Windows can load the pinned Token source without installing macOS fastlane.
if ENV["ASC_TEST_FASTLANE_TOKEN"]
  module Spaceship; class ConnectAPI; end; end
  load ENV.fetch("ASC_TEST_FASTLANE_TOKEN")
  $LOADED_FEATURES << "spaceship.rb"
end
require_relative "asc_token"

class AscTokenTest < Minitest::Test
  def test_real_python_ipc_signing_refresh_and_no_private_key_in_spaceship
    key = OpenSSL::PKey::EC.generate("prime256v1")
    saved = ENV.to_h
    ENV.update("ASC_SETUP_PYTHON" => ENV.fetch("ASC_TEST_PYTHON"),
      "APP_STORE_CONNECT_KEY_IDENTIFIER" => "DUMMYKEY01", "APP_STORE_CONNECT_ISSUER_ID" => "dummy-issuer",
      "APP_STORE_CONNECT_PRIVATE_KEY" => key.private_to_pem)
    token = AscCodemagicToken.new(in_house: false)
    2.times do
      claims, header = JWT.decode(token.text, OpenSSL::PKey.read(key.public_to_pem), true,
        algorithm: "ES256", audience: "appstoreconnect-v1", verify_aud: true)
      assert_equal "dummy-issuer", claims["iss"]
      assert_equal "DUMMYKEY01", header["kid"]
      assert_equal claims["exp"] - 30, token.expiration.to_i
      refute token.expired?
      assert_nil token.key_raw
      refute token.in_house
      refute_includes token.inspect, token.text
      token.instance_variable_set(:@expiration, Time.at(0))
      assert token.expired?
      token.refresh!
    end
  ensure
    ENV.replace(saved) if saved
  end

  def test_failed_or_malformed_ipc_never_exposes_output_or_stderr
    marker = "asc11-secret-marker"
    saved = ENV["ASC_SETUP_PYTHON"]
    ENV["ASC_SETUP_PYTHON"] = "dummy-python"
    [[marker, marker, false], [marker, marker, true],
     [JSON.generate(token: marker, expiration: Time.now.to_i + 1140), marker, true],
     [JSON.generate(token: "dummy.jwt.signature", expiration: 0), marker, true]].each do |out, err, success|
      result = [out, err, Struct.new(:success?).new(success)]
      Open3.stub(:capture3, result) do
        error = assert_raises(RuntimeError) { AscCodemagicToken.new(in_house: false) }
        refute_includes error.message, marker
        assert_nil error.cause
      end
    end
  ensure
    saved ? ENV["ASC_SETUP_PYTHON"] = saved : ENV.delete("ASC_SETUP_PYTHON")
  end
end
