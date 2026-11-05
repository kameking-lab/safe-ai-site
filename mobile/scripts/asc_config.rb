# Validate public listing parameters before credentials or ASC writes.
module AscConfig
  TAG = /\Aasc-anzen-v(1\.0\.0)-b([1-9][0-9]*|latest)-r([A-Za-z0-9][A-Za-z0-9-]{0,39})\z/.freeze

  def self.read(env)
    raise "Review submission is disabled for Anzen listing" unless [nil, "", "false"].include?(env["SUBMIT_FOR_REVIEW"])
    raise "Unexpected ASC app identity" unless env["APP_STORE_APPLE_ID"] == "6831079439"
    raise "Only native version 1.0.0 is supported" unless [nil, "", "1.0.0"].include?(env["ASC_APP_VERSION"])
    match = TAG.match(env.fetch("CM_TAG", ""))
    raise "Use asc-anzen-v1.0.0-bBUILD-rRUN (BUILD: integer or latest); no submit tags" unless match
    { apple_id: "6831079439", version: match[1], build: match[2], submit: false }
  end
end

if $PROGRAM_NAME == __FILE__
  config = AscConfig.read(ENV)
  puts "ASC_APP_VERSION=#{config[:version]}"
  puts "ASC_BUILD_NUMBER=#{config[:build]}"
  puts "SUBMIT_FOR_REVIEW=false"
end
