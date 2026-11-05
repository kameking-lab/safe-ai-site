# Exercise the actual Fastfile from fastlane's real working directory, without gems,
# credentials, network or artifacts. Stop exactly at the upload boundary.
require "json"
require "fileutils"
$LOADED_FEATURES << "spaceship.rb"

module UI
  def self.message(_message); end
  def self.user_error!(message)
    raise message
  end
end
module Spaceship
  module ConnectAPI
    class << self
      attr_accessor :token, :app, :builds, :review_creations
      def post_app_store_review_detail(app_store_version_id:, attributes:)
        raise "Review create must be empty" unless attributes == {} && app_store_version_id == app.editable.id
        self.review_creations = (review_creations || 0) + 1
        app.editable.review = ReviewRecord.new
      end
    end
    class Token
      def initialize(**); end
    end
    class App
      def self.find(_bundle); ConnectAPI.app; end
    end
    class Build
      def self.all(**options)
        raise "Unsafe lookup" unless options[:build_number] == "17" && options[:version] == "1.0.0" && options[:processing_states] == "PROCESSING,FAILED,INVALID,VALID" && options[:app_id] == "6831079439" && options[:platform] == "IOS"
        ConnectAPI.builds
      end
    end
  end
end
class UploadBoundary < StandardError; end
class LaneHarness
  attr_reader :options
  attr_accessor :return_without_submission
  def default_platform(*); end
  def platform(*); yield; end
  def desc(*); end
  def lane(*, &block); @lane = block; end
  def sh(_command, script, *_flags)
    raise "Wrong validation path under fastlane cwd" unless File.file?(script)
  end
  def deliver(**options)
    @options = options
    raise UploadBoundary unless return_without_submission
  end
  def sleep(_seconds); end
  def run; @lane.call; end
end
ReviewRecord = Struct.new(:contact_first_name, :contact_last_name, :contact_phone, :contact_email,
                         :demo_account_name, :demo_account_password, :demo_account_required, :updates) do
  def update(attributes:); self.updates = attributes; end
end
Version = Struct.new(:id, :version_string, :app_version_state, :app_store_state, :selected, :review, :renamed_to, :review_error) do
  def select_build(build_id:); self.selected = build_id; end
  def fetch_app_store_review_detail
    if review_error
      error = review_error
      self.review_error = nil
      raise error
    end
    review
  end
  def update(attributes:)
    if attributes.keys == [:versionString]
      self.renamed_to = attributes[:versionString]
    else
      raise "Automatic release" unless attributes == { releaseType: "MANUAL" }
    end
  end
end
AppRecord = Struct.new(:id, :version, :editable) do
  def get_app_store_versions(filter:)
    [version].compact.select { |v| (v.renamed_to || v.version_string) == filter[:versionString] }
  end
  def get_edit_app_store_version(**); editable; end
end
BuildRecord = Struct.new(:id, :expired, :version, :processing_state)
ENV.update("ASC_BUILD_NUMBER" => "17", "SUBMIT_FOR_REVIEW" => "false", "ASC_REVIEW_INFO_READY" => "false",
  "APP_STORE_APPLE_ID" => "6831079439", "CM_TAG" => "asc-anzen-v1.0.0-b17-r01")
root = File.expand_path("..", __dir__)
Dir.chdir(File.join(root, "fastlane")) do
  v = Version.new("v1", "1.0.0", "PREPARE_FOR_SUBMISSION")
  Spaceship::ConnectAPI.app = AppRecord.new("6831079439", v, v)
  Spaceship::ConnectAPI.builds = [BuildRecord.new("b17", false, "17", "VALID")]
  h = LaneHarness.new
  h.instance_eval(File.read("Fastfile"), File.expand_path("Fastfile"), 1)
  begin; h.run; rescue UploadBoundary; end
  raise "Build wasn't explicitly selected" unless v.selected == "b17"
  o = h.options
  raise "Unsafe default upload flags" unless o[:skip_binary_upload] && !o[:submit_for_review] && !o[:automatic_release] && !o[:reject_if_possible]
  raise "Wrong metadata path" unless File.file?(File.join(o[:metadata_path], "ja/name.txt"))
  raise "Unexpected review secrets" if o.key?(:app_review_information)
  v.selected = nil
  Spaceship::ConnectAPI.app.editable = Version.new("other", "1.1.0", "PREPARE_FOR_SUBMISSION")
  begin
    h.run
    raise "Version mismatch should fail"
  rescue RuntimeError => error
    raise unless error.message == "deliver would target another version"
  end
  raise "Mutated build before mismatch rejection" if v.selected
  Spaceship::ConnectAPI.app.editable = v
  # Rename ASC's initial 1.0 draft and verify by ID, including a stale model string.
  draft = Version.new("draft", "1.0", "PREPARE_FOR_SUBMISSION")
  Spaceship::ConnectAPI.app = AppRecord.new("6831079439", draft, draft)
  draft.review_error = "No data"
  before = Spaceship::ConnectAPI.review_creations
  begin; h.run; rescue UploadBoundary; end
  raise "Draft was not reused" unless draft.renamed_to == "1.0.0" && draft.selected == "b17"
  raise "Missing review detail not created" unless Spaceship::ConnectAPI.review_creations == before + 1
  begin; h.run; rescue UploadBoundary; end
  raise "Existing review detail recreated" unless Spaceship::ConnectAPI.review_creations == before + 1
  draft.review_error = "Permission denied"
  begin
    h.run
    raise "Review API failure swallowed"
  rescue RuntimeError => error
    raise unless error.message == "Permission denied"
  end
  %w[IN_REVIEW READY_FOR_DISTRIBUTION REJECTED].each do |state|
    blocked = Version.new("blocked", "1.0", state)
    Spaceship::ConnectAPI.app = AppRecord.new("6831079439", blocked, blocked)
    begin
      h.run
      raise "Unsafe draft rename"
    rescue RuntimeError => error
      raise unless error.message == "Another editable version exists"
    end
    raise "Mutated protected version" if blocked.renamed_to || blocked.selected
  end
  Spaceship::ConnectAPI.app = AppRecord.new("6831079439", v, v)
  ENV["SUBMIT_FOR_REVIEW"] = "true"
  v.selected = nil
  begin
    h.run
    raise "Submission override accepted"
  rescue RuntimeError => error
    raise unless error.message == "Review submission is disabled for Anzen listing"
  end
  raise "Mutation before submission rejection" if v.selected
end
puts "ASC Fastfile draft reuse, empty review detail, protected states and no-submission boundary PASS"
