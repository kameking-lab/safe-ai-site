require 'xcodeproj'
require 'json'

bundle_id = 'jp.anzen-ai-portal.app'
build_number = ENV.fetch('BUILD_NUMBER', '1')
raise 'Invalid build number' unless build_number.match?(/\A[1-9]\d*\z/)
apns = ENV.fetch('ANZEN_APNS_ENVIRONMENT', 'development')
raise 'Invalid APNs environment' unless %w[development production].include?(apns)
project = Xcodeproj::Project.open('ios/App/App.xcodeproj')
target = project.targets.find { |item| item.name == 'App' }
raise 'App target missing' unless target
target.build_configurations.each do |configuration|
  configuration.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => bundle_id, 'MARKETING_VERSION' => '1.0.0',
    'CURRENT_PROJECT_VERSION' => build_number, 'TARGETED_DEVICE_FAMILY' => '1',
    'IPHONEOS_DEPLOYMENT_TARGET' => '16.0', 'SWIFT_VERSION' => '5.0',
    'CODE_SIGN_ENTITLEMENTS' => 'App/App.entitlements'
  })
end
group = project.main_group.find_subpath('App', false)
raise 'App group missing' unless group
{ 'NativeVault.swift' => target.source_build_phase, 'PrivacyInfo.xcprivacy' => target.resources_build_phase }.each do |name, phase|
  reference = group.files.find { |file| file.path == name } || group.new_file(name)
  phase.add_file_reference(reference, true)
end
attributes = project.root_object.attributes
attributes['TargetAttributes'] ||= {}
attributes['TargetAttributes'][target.uuid] ||= {}
attributes['TargetAttributes'][target.uuid]['SystemCapabilities'] ||= {}
%w[com.apple.InAppPurchase com.apple.Push].each do |capability|
  attributes['TargetAttributes'][target.uuid]['SystemCapabilities'][capability] = { 'enabled' => 1 }
end
project.save

plist_path = 'ios/App/App/Info.plist'
plist = Xcodeproj::Plist.read_from_path(plist_path)
plist.merge!({
  'CFBundleIdentifier' => '$(PRODUCT_BUNDLE_IDENTIFIER)',
  'CFBundleVersion' => '$(CURRENT_PROJECT_VERSION)',
  'CFBundleShortVersionString' => '$(MARKETING_VERSION)',
  'CFBundleDevelopmentRegion' => 'ja', 'CFBundleLocalizations' => ['ja'],
  'CFBundleDisplayName' => '安全AIポータル', 'ITSAppUsesNonExemptEncryption' => false,
  'UIFileSharingEnabled' => false, 'LSSupportsOpeningDocumentsInPlace' => false,
  'NSAppTransportSecurity' => { 'NSAllowsArbitraryLoads' => false },
  'CFBundleURLTypes' => [{ 'CFBundleURLName' => "#{bundle_id}.auth", 'CFBundleURLSchemes' => ['anzenai'] }],
  'NSMicrophoneUsageDescription' => '入力欄へ音声で文字を入力するためにマイクを使用します。音声入力を選んだ時だけ起動します。',
  'NSSpeechRecognitionUsageDescription' => '入力欄への音声入力に端末内の音声認識を使用します。認識した文字は確認後に利用できます。'
})
Xcodeproj::Plist.write_to_path(plist, plist_path)
Xcodeproj::Plist.write_to_path({ 'aps-environment' => apns }, 'ios/App/App/App.entitlements')
config_path = 'ios/App/App/capacitor.config.json'
config = JSON.parse(File.read(config_path))
config['appId'] = bundle_id
File.write(config_path, JSON.pretty_generate(config) + "\n")

storyboard_path = 'ios/App/App/Base.lproj/Main.storyboard'
story = File.read(storyboard_path)
unless story.include?('customClass="AnzenBridgeViewController"')
  story = story.sub('customClass="CAPBridgeViewController" customModule="Capacitor"', 'customClass="AnzenBridgeViewController" customModule="App" customModuleProvider="target"')
  raise 'Unsupported Capacitor storyboard' unless story.include?('customClass="AnzenBridgeViewController"')
  File.write(storyboard_path, story)
end
# Capacitor 8's SPM template builds the window in SceneDelegate and ignores the
# storyboard class. Without this, NativeVault/NativeDocuments/NativeSpeech are
# never registered and every Keychain-backed API call rejects on a real device.
scene_path = 'ios/App/App/SceneDelegate.swift'
if File.exist?(scene_path)
  scene = File.read(scene_path)
  unless scene.include?('rootViewController = AnzenBridgeViewController()')
    scene = scene.sub('rootViewController = CAPBridgeViewController()', 'rootViewController = AnzenBridgeViewController()')
    raise 'Unsupported Capacitor SceneDelegate' unless scene.include?('rootViewController = AnzenBridgeViewController()')
    File.write(scene_path, scene)
  end
end
delegate_path = 'ios/App/App/AppDelegate.swift'
delegate = File.read(delegate_path)
unless delegate.include?('didRegisterForRemoteNotificationsWithDeviceToken')
  at = delegate.rindex('}') or raise 'AppDelegate class missing'
  delegate.insert(at, <<~SWIFT)
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
  SWIFT
  File.write(delegate_path, delegate)
end
puts 'Configured registered Bundle ID, iPhone resources, APNs and version.'
