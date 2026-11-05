require "minitest/autorun"
require "minitest/mock"
require_relative "asc_build"

module Spaceship; module ConnectAPI; class Build
  def self.all(**); raise "Unstubbed API call"; end
end; end; end

class AscBuildTest < Minitest::Test
  Build = Struct.new(:id, :version, :processing_state, :expired)

  def select(pages, requested: "17")
    @queries = []
    @waits = 0
    lookup = lambda do |**query|
      @queries << query
      pages.shift || []
    end
    Spaceship::ConnectAPI::Build.stub(:all, lookup) do
      AscBuild.select(app_id: "6831079439", version: "1.0.0", requested: requested,
        attempts: 3, pause: -> { @waits += 1 })
    end
  end

  def test_exact_waits_for_visibility_and_processing_without_falling_back
    valid = Build.new("b17", "17", "VALID", false)
    assert_equal valid, select([[], [Build.new("b17", "17", "PROCESSING", false)], [valid]])
    assert_equal 2, @waits
    @queries.each do |q|
      assert_equal "17", q[:build_number]
      assert_equal "6831079439", q[:app_id]
      assert_equal "1.0.0", q[:version]
      assert_equal "IOS", q[:platform]
    end
    assert_raises(RuntimeError) { select([[Build.new("b18", "18", "VALID", false)]]) }
    assert_equal 2, @waits
  end

  def test_latest_selects_first_unexpired_valid_from_server_upload_order
    valid = Build.new("b18", "18", "VALID", false)
    assert_equal valid, select([[Build.new("b19", "19", "VALID", true), valid,
      Build.new("b17", "17", "VALID", false)]], requested: "latest")
    assert_equal 0, @waits
    assert_nil @queries.first[:build_number]
    assert_equal "VALID", @queries.first[:processing_states]
    assert_equal "-uploadedDate", @queries.first[:sort]
  end

  def test_failed_expired_duplicate_and_noninteger_builds_stop
    %w[FAILED INVALID].each do |state|
      assert_raises(RuntimeError) { select([[Build.new("b17", "17", state, false)]]) }
      assert_equal 0, @waits
    end
    assert_raises(RuntimeError) { select([[Build.new("b17", "17", "VALID", true)]]) }
    build = Build.new("b17", "17", "VALID", false)
    assert_raises(RuntimeError) { select([[build, build]]) }
    assert_raises(RuntimeError) { select([[Build.new("bad", "x", "VALID", false)]], requested: "latest") }
  end

  def test_latest_waits_when_no_valid_build_is_available
    build = Build.new("b18", "18", "VALID", false)
    assert_equal build, select([[], [build]], requested: "latest")
    assert_equal 1, @waits
    assert_raises(RuntimeError) { select([[], [], []], requested: "latest") }
    assert_equal 2, @waits
  end
end
