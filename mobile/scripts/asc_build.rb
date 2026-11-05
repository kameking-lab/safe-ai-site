# Resolve only iOS builds from the requested app/version before any ASC write.
module AscBuild
  def self.select(app_id:, version:, requested:, attempts: 61, pause: -> { sleep(30) })
    latest = requested == "latest"
    attempts.times do |attempt|
      builds = Spaceship::ConnectAPI::Build.all(
        app_id: app_id, version: version, build_number: latest ? nil : requested,
        platform: "IOS", processing_states: latest ? "VALID" : "PROCESSING,FAILED,INVALID,VALID",
        sort: "-uploadedDate"
      )
      builds = builds.select { |b| b.version == requested } unless latest
      raise "Ambiguous exact ASC build" if !latest && builds.length > 1
      if !latest && builds.any? { |b| b.expired || %w[FAILED INVALID].include?(b.processing_state) }
        raise "Requested ASC build is expired or failed processing"
      end
      build = builds.find { |b| b.processing_state == "VALID" && b.expired == false }
      if build
        raise "ASC build must have an integer number" unless build.version.to_s.match?(/\A[1-9]\d*\z/)
        return build
      end
      pause.call unless attempt == attempts - 1
    end
    raise "No processed, unexpired ASC build available after waiting; no fallback from an exact number"
  end
end
